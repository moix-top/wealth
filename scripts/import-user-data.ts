// Importa un data.json de la app original (Vite + Express, fichero único en
// disco) al espacio de un usuario concreto en DynamoDB.
//
//   npm run import -- --file ../wealth/data.json --email radamuz16@gmail.com
//   npm run import -- --file ../wealth/data.json --email x@y.com --dry-run
//
// Requiere credenciales AWS con permisos de datos sobre la tabla. Sirve
// cualquier forma que entienda el SDK; lo habitual es el perfil:
//   AWS_PROFILE=radamuz AWS_REGION=eu-west-1 DYNAMODB_TABLE=wealth-data npm run import -- …
//
// Lo que hace:
//   1. Valida el fichero con el mismo esquema zod que usa la API.
//   2. Rellena `assetClass` explícito en cada subgrupo (en el formato original
//      era opcional y se inferían por regex en cada render: aquí se congela el
//      valor una vez, para no depender de una heurística frágil).
//   3. Escribe PROFILE + PORTFOLIO + un ítem por snapshot bajo USER#<email>.
//   4. Aborta si el usuario ya tiene datos, salvo --force.

import { readFileSync } from "node:fs";
import { z } from "zod";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
// Imports relativos, no con el alias "@/": este script lo ejecuta tsx directo,
// fuera del resolutor de Next.
import { KEYS, TABLE_NAME, getDocClient, snapshotSk, userPk } from "../lib/dynamo";
import { assetClassSchema, groupsSchema, snapshotSchema, type Group } from "../lib/types";
import { assetClassOf } from "../lib/utils";
import { normalizeEmail } from "../lib/auth";

// Cargador de .env sin dependencias (mismo enfoque que el seed de referencia).
function loadEnv(path = ".env.local"): void {
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Sin .env.local no pasa nada: se usarán las variables del entorno.
  }
}

const legacyFileSchema = z.object({
  groups: groupsSchema,
  snapshots: z.array(snapshotSchema).default([]),
});

function parseArgs(argv: string[]) {
  const args = { file: "", email: "", overrides: "", dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--file": args.file = argv[++i] ?? ""; break;
      case "--email": args.email = argv[++i] ?? ""; break;
      case "--overrides": args.overrides = argv[++i] ?? ""; break;
      case "--dry-run": args.dryRun = true; break;
      case "--force": args.force = true; break;
      case "-h":
      case "--help":
        console.log(
          "Uso: npm run import -- --file <data.json> --email <email> [--overrides <json>] [--dry-run] [--force]",
        );
        process.exit(0);
    }
  }
  return args;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Congela la clase de activo de cada partida (antes se inferían al vuelo).
 *
 * `overrides` mapea nombre de subgrupo → clase, para lo que la heurística no
 * puede acertar sola: "Cartesio X, Fi" es un fondo mixto y "Telefónica" una
 * acción, pero eso no está en el nombre. Ver scripts/asset-classes.example.json.
 */
function withAssetClasses(groups: Group[], overrides: Record<string, string>): Group[] {
  const byName = new Map(Object.entries(overrides).map(([k, v]) => [k.toLowerCase(), v]));
  return groups.map((g) => ({
    ...g,
    subgroups: g.subgroups.map((s) => ({
      ...s,
      assetClass:
        (byName.get(s.name.toLowerCase()) as Group["subgroups"][number]["assetClass"]) ??
        s.assetClass ??
        assetClassOf(s, g.name),
    })),
  }));
}

/** Lee el JSON de correcciones. Las claves `_…` son comentarios, se ignoran. */
function readOverrides(path: string): Record<string, string> {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const entries = Object.entries(raw).filter(([k]) => !k.startsWith("_"));
  return z.record(z.string(), assetClassSchema).parse(Object.fromEntries(entries));
}

async function hasData(userId: string): Promise<boolean> {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": userPk(userId) },
      Limit: 1,
    }),
  );
  return (res.Items?.length ?? 0) > 0;
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!args.file || !args.email) {
    console.error("error: --file y --email son obligatorios");
    process.exit(1);
  }

  const userId = normalizeEmail(args.email);
  const parsed = legacyFileSchema.parse(JSON.parse(readFileSync(args.file, "utf-8")));
  const overrides = args.overrides ? readOverrides(args.overrides) : {};
  const groups = withAssetClasses(parsed.groups, overrides);
  const snapshots = parsed.snapshots;

  // Resumen para cuadrar contra el total del fichero de origen y detectar
  // cualquier pérdida antes de escribir nada.
  const total = groups.reduce(
    (a, g) => a + g.subgroups.reduce((b, s) => b + (s.amount || 0), 0),
    0,
  );
  const subCount = groups.reduce((a, g) => a + g.subgroups.length, 0);

  console.log(`Fichero:   ${args.file}`);
  console.log(`Usuario:   ${userId}`);
  console.log(`Tabla:     ${TABLE_NAME}`);
  console.log(`Contenido: ${groups.length} grupos, ${subCount} subgrupos, ${snapshots.length} snapshots`);
  console.log(`Total:     ${fmtEur(total)}`);
  console.log();
  for (const g of groups) {
    const gt = g.subgroups.reduce((a, s) => a + (s.amount || 0), 0);
    console.log(`  ${g.name.padEnd(24)} ${fmtEur(gt).padStart(14)}`);
    for (const s of g.subgroups) {
      console.log(`    · ${s.name.padEnd(30)} ${fmtEur(s.amount).padStart(12)}  [${s.assetClass}]`);
    }
  }
  console.log();

  if (args.dryRun) {
    console.log("--dry-run: no se ha escrito nada.");
    return;
  }

  // A diferencia de la app (que cae a memoria sin credenciales), aquí escribir
  // en DynamoDB es todo el propósito: nunca se usa el modo memoria. Se deja que
  // el SDK resuelva las credenciales por su cadena habitual —AWS_PROFILE,
  // ~/.aws/credentials, variables de entorno— en vez de exigir claves sueltas.
  if (!args.force && (await hasData(userId))) {
    console.error(
      `error: ${userId} ya tiene datos en la tabla. Revísalos antes de sobrescribir, o usa --force.`,
    );
    process.exit(1);
  }

  const client = getDocClient();
  const pk = userPk(userId);
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk, sk: KEYS.PROFILE, email: userId, createdAt: now, updatedAt: now },
    }),
  );
  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { pk, sk: KEYS.PORTFOLIO, groups, version: 1, updatedAt: now },
    }),
  );
  for (const snap of snapshots) {
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { pk, sk: snapshotSk(snap.date, snap.id), ...snap, createdAt: snap.date },
      }),
    );
  }

  console.log(`✔ Importado: cartera + ${snapshots.length} snapshot(s) en ${TABLE_NAME}.`);
  console.log(`  Entra en la app con ${userId} y comprueba que el Resumen marca ${fmtEur(total)}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
