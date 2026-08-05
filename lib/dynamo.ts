import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Cliente DynamoDB compartido (single-table). Todo vive en UNA tabla con clave
// pk/sk, donde la pk identifica al usuario y el prefijo de la sk discrimina la
// entidad:
//
//   pk = USER#<email>   sk = PROFILE                 → perfil
//   pk = USER#<email>   sk = PORTFOLIO               → grupos y subgrupos
//   pk = USER#<email>   sk = SNAPSHOT#<iso>#<id>     → un ítem por snapshot
//
// 🔒 Que la pk sea el usuario es lo que garantiza el aislamiento: una Query
// siempre va acotada a `pk = USER#<email-de-la-sesión>`, así que es imposible
// que una petición roce datos de otra persona. Nunca se usa Scan.
//
// Si faltan las credenciales de AWS, isDynamoEnabled() devuelve false y el
// servicio cae a almacenamiento en memoria: la app funciona sin cuenta de AWS
// (útil en dev y en los tests de CI).

export const TABLE_NAME = process.env.DYNAMODB_TABLE || "wealth-data";
export const REGION = process.env.AWS_REGION || "eu-west-1";

// Prefijos centralizados para que servicio y script de import no se desalineen.
export const KEYS = {
  USER: "USER",
  PROFILE: "PROFILE",
  PORTFOLIO: "PORTFOLIO",
  SNAPSHOT: "SNAPSHOT",
} as const;

/** Clave de partición de un usuario. Único sitio donde se construye. */
export const userPk = (userId: string): string => `${KEYS.USER}#${userId}`;

/**
 * La fecha va delante del id en la sk para que una Query devuelva el histórico
 * ya ordenado cronológicamente, sin ordenar en memoria.
 */
export const snapshotSk = (dateIso: string, id: string): string =>
  `${KEYS.SNAPSHOT}#${dateIso}#${id}`;

export function isDynamoEnabled(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

let docClient: DynamoDBDocumentClient | null = null;

// Se construye en diferido: importar este módulo nunca falla sin credenciales.
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const config: ConstructorParameters<typeof DynamoDBClient>[0] = { region: REGION };
    // DYNAMODB_ENDPOINT permite apuntar a DynamoDB Local en tests o en el import.
    if (process.env.DYNAMODB_ENDPOINT) config.endpoint = process.env.DYNAMODB_ENDPOINT;
    const base = new DynamoDBClient(config);
    docClient = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

export function resetDocClient(): void {
  docClient = null;
}
