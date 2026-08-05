// Única vía de acceso a datos. Toda función recibe `userId` como PRIMER
// parámetro obligatorio y lo convierte en la clave de partición; las rutas lo
// obtienen de requireSession() y de ningún otro sitio.
//
// 🔒 Invariantes de aislamiento (lo que hay que preservar al tocar este fichero):
//   1. `userPk(userId)` se calcula aquí, nunca llega hecho desde fuera.
//   2. Toda lectura es Query/Get acotada a esa pk. Nunca Scan.
//   3. Toda escritura y todo borrado llevan la pk del usuario en la clave, así
//      que un id de snapshot ajeno simplemente no existe en su partición → 404.
//   4. Los campos pk/sk que vengan en un body se descartan: los ítems se
//      construyen a mano, campo a campo, nunca con spread del input.

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  KEYS,
  REGION,
  TABLE_NAME,
  getDocClient,
  isDynamoEnabled,
  snapshotSk,
  userPk,
} from "@/lib/dynamo";
import { httpError } from "@/lib/http";
import type { Group, Portfolio, Snapshot, StorageInfo, WealthData } from "@/lib/types";

// ── Almacén en memoria (modo sin AWS) ────────────────────────────────────────
// Deliberadamente con la MISMA forma de claves que DynamoDB (pk → sk → ítem),
// para que los tests de aislamiento ejerciten la misma lógica de partición.
interface MemoryItem {
  pk: string;
  sk: string;
  [k: string]: unknown;
}
const memory = new Map<string, Map<string, MemoryItem>>();

const memPartition = (pk: string): Map<string, MemoryItem> => {
  let p = memory.get(pk);
  if (!p) {
    p = new Map();
    memory.set(pk, p);
  }
  return p;
};

/** Solo para tests. */
export function resetMemory(): void {
  memory.clear();
}

// ── Perfil / alta ────────────────────────────────────────────────────────────

export interface Profile {
  email: string;
  googleSub?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alta implícita: la primera petición autenticada crea el perfil. Eso es todo
 * el "registro" que hay — no existe formulario ni aprobación.
 *
 * Si el perfil ya existe con otro googleSub se registra un aviso: significa que
 * ese email verificado llega ahora desde otra cuenta de Google. No se bloquea
 * (Google Workspace permite recrear cuentas), pero conviene que quede rastro.
 */
export async function ensureUser(userId: string, googleSub?: string): Promise<Profile> {
  const now = new Date().toISOString();
  const existing = await getProfile(userId);

  if (existing) {
    if (googleSub && existing.googleSub && existing.googleSub !== googleSub) {
      console.warn(
        `[wealth] El email ${userId} llega con un googleSub distinto al registrado.`,
      );
    }
    return existing;
  }

  const profile: Profile = { email: userId, googleSub, createdAt: now, updatedAt: now };
  const item = { pk: userPk(userId), sk: KEYS.PROFILE, ...profile };

  if (!isDynamoEnabled()) {
    memPartition(item.pk).set(item.sk, item as MemoryItem);
    return profile;
  }

  try {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        // Carrera entre dos peticiones simultáneas del mismo usuario recién
        // llegado: la segunda falla aquí y se queda con el perfil de la primera.
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  } catch (e) {
    if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
      return (await getProfile(userId)) ?? profile;
    }
    throw e;
  }
  return profile;
}

async function getProfile(userId: string): Promise<Profile | null> {
  const pk = userPk(userId);
  if (!isDynamoEnabled()) {
    return (memPartition(pk).get(KEYS.PROFILE) as unknown as Profile) ?? null;
  }
  const res = await getDocClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: KEYS.PROFILE } }),
  );
  return (res.Item as Profile | undefined) ?? null;
}

// ── Cartera ──────────────────────────────────────────────────────────────────

const EMPTY_PORTFOLIO = (): Portfolio => ({
  groups: [],
  version: 0,
  updatedAt: new Date().toISOString(),
});

export async function getPortfolio(userId: string): Promise<Portfolio> {
  const pk = userPk(userId);

  if (!isDynamoEnabled()) {
    const item = memPartition(pk).get(KEYS.PORTFOLIO);
    return item ? (item as unknown as Portfolio) : EMPTY_PORTFOLIO();
  }

  const res = await getDocClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: KEYS.PORTFOLIO } }),
  );
  if (!res.Item) return EMPTY_PORTFOLIO();
  return {
    groups: (res.Item.groups as Group[]) ?? [],
    version: (res.Item.version as number) ?? 0,
    updatedAt: (res.Item.updatedAt as string) ?? new Date().toISOString(),
  };
}

/**
 * Escribe la cartera entera, igual que hacía el store original. `expectedVersion`
 * activa el bloqueo optimista: si otra pestaña ha guardado en medio, esto lanza
 * 409 en vez de pisar el cambio en silencio (que es lo que hacía la app vieja).
 * Sin `expectedVersion` se escribe sin condición (last-writer-wins).
 */
export async function savePortfolio(
  userId: string,
  groups: Group[],
  expectedVersion?: number,
): Promise<Portfolio> {
  const pk = userPk(userId);
  const now = new Date().toISOString();

  if (!isDynamoEnabled()) {
    const part = memPartition(pk);
    const current = (part.get(KEYS.PORTFOLIO) as unknown as Portfolio | undefined) ?? null;
    const currentVersion = current?.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw httpError(409, "La cartera ha cambiado en otra sesión. Recarga la página.");
    }
    const next: Portfolio = { groups, version: currentVersion + 1, updatedAt: now };
    part.set(KEYS.PORTFOLIO, { pk, sk: KEYS.PORTFOLIO, ...next } as MemoryItem);
    return next;
  }

  const nextVersion = (expectedVersion ?? (await getPortfolio(userId)).version) + 1;

  try {
    await getDocClient().send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: KEYS.PORTFOLIO },
        UpdateExpression: "SET #g = :g, #v = :v, #u = :u",
        ExpressionAttributeNames: { "#g": "groups", "#v": "version", "#u": "updatedAt" },
        ExpressionAttributeValues: {
          ":g": groups,
          ":v": nextVersion,
          ":u": now,
          ...(expectedVersion !== undefined ? { ":expected": expectedVersion } : {}),
        },
        ...(expectedVersion !== undefined
          ? {
              // Vale tanto si el ítem no existe (primera vez, expected 0) como
              // si existe con la versión esperada.
              ConditionExpression:
                "attribute_not_exists(pk) OR #v = :expected",
            }
          : {}),
      }),
    );
  } catch (e) {
    if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
      throw httpError(409, "La cartera ha cambiado en otra sesión. Recarga la página.");
    }
    throw e;
  }

  return { groups, version: nextVersion, updatedAt: now };
}

// ── Snapshots ────────────────────────────────────────────────────────────────

const isSnapshotSk = (sk: string) => sk.startsWith(`${KEYS.SNAPSHOT}#`);

const toSnapshot = (item: Record<string, unknown>): Snapshot => ({
  id: item.id as string,
  label: item.label as string,
  date: item.date as string,
  values: (item.values as Record<string, number>) ?? {},
});

export async function listSnapshots(userId: string): Promise<Snapshot[]> {
  const pk = userPk(userId);

  if (!isDynamoEnabled()) {
    return [...memPartition(pk).entries()]
      .filter(([sk]) => isSnapshotSk(sk))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, item]) => toSnapshot(item));
  }

  // Query acotada a la partición del usuario, con el prefijo de sk. Devuelve
  // ya ordenado por fecha porque la sk empieza por el ISO.
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": `${KEYS.SNAPSHOT}#` },
      ScanIndexForward: true,
    }),
  );
  return (res.Items ?? []).map(toSnapshot);
}

/** Busca la sk de un snapshot dentro de la partición del usuario. */
async function findSnapshotSk(userId: string, id: string): Promise<string | null> {
  const pk = userPk(userId);

  if (!isDynamoEnabled()) {
    for (const [sk, item] of memPartition(pk)) {
      if (isSnapshotSk(sk) && item.id === id) return sk;
    }
    return null;
  }

  // La sk lleva la fecha delante, que no conocemos: se filtra la partición.
  // Sigue siendo una Query sobre una sola partición (nunca un Scan), y el
  // volumen por usuario es de decenas de ítems.
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": `${KEYS.SNAPSHOT}#`, ":id": id },
      ProjectionExpression: "sk",
    }),
  );
  const found = res.Items?.[0];
  return found ? (found.sk as string) : null;
}

export async function createSnapshot(
  userId: string,
  input: { id?: string; label?: string; values: Record<string, number>; date?: string },
): Promise<Snapshot> {
  const pk = userPk(userId);
  const date = input.date ?? new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const snapshot: Snapshot = {
    id,
    label: input.label?.trim() || `Snapshot ${new Date(date).toLocaleDateString("es-ES")}`,
    date,
    values: input.values,
  };
  const sk = snapshotSk(date, id);
  // El ítem se construye campo a campo: nada del body puede colarse como pk/sk.
  const item = { pk, sk, ...snapshot, createdAt: date };

  if (!isDynamoEnabled()) {
    memPartition(pk).set(sk, item as MemoryItem);
    return snapshot;
  }

  await getDocClient().send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(sk)",
    }),
  );
  return snapshot;
}

export async function renameSnapshot(
  userId: string,
  id: string,
  label: string,
): Promise<Snapshot> {
  const pk = userPk(userId);
  const sk = await findSnapshotSk(userId, id);
  // Un id de otro usuario no aparece en esta partición → 404, sin filtrar
  // siquiera si existe en otra parte.
  if (!sk) throw httpError(404, "Snapshot no encontrado");

  if (!isDynamoEnabled()) {
    const item = memPartition(pk).get(sk)!;
    item.label = label;
    return toSnapshot(item);
  }

  const res = await getDocClient().send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
      UpdateExpression: "SET #l = :l",
      ExpressionAttributeNames: { "#l": "label" },
      ExpressionAttributeValues: { ":l": label },
      ConditionExpression: "attribute_exists(pk)",
      ReturnValues: "ALL_NEW",
    }),
  );
  return toSnapshot(res.Attributes as Record<string, unknown>);
}

export async function deleteSnapshot(userId: string, id: string): Promise<void> {
  const pk = userPk(userId);
  const sk = await findSnapshotSk(userId, id);
  if (!sk) throw httpError(404, "Snapshot no encontrado");

  if (!isDynamoEnabled()) {
    memPartition(pk).delete(sk);
    return;
  }

  await getDocClient().send(
    new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk } }),
  );
}

// ── Vista compuesta ──────────────────────────────────────────────────────────

/** Lo que carga el cliente de una vez al arrancar. */
export async function getWealthData(userId: string): Promise<WealthData> {
  const [portfolio, snapshots] = await Promise.all([
    getPortfolio(userId),
    listSnapshots(userId),
  ]);
  return { groups: portfolio.groups, snapshots, version: portfolio.version };
}

export function storageInfo(): StorageInfo {
  return isDynamoEnabled()
    ? { mode: "dynamodb", table: TABLE_NAME, region: REGION }
    : { mode: "memory" };
}
