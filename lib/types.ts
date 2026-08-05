// Contrato de datos compartido entre servidor y cliente. La app original no
// tenía tipos ni validación: aquí el esquema zod es la fuente de verdad y los
// tipos TypeScript se derivan de él, para que no puedan divergir.

import { z } from "zod";

export const ASSET_CLASS_KEYS = [
  "liquidez",
  "monetario",
  "rf",
  "mixto",
  "rv",
  "cripto",
  "seguro",
  "inmueble",
  "bien",
  "otro",
] as const;

export const assetClassSchema = z.enum(ASSET_CLASS_KEYS);

// Los ids los genera el cliente (crypto.randomUUID). Se acota la longitud para
// que nadie pueda inflar el ítem con una clave arbitrariamente larga.
const idSchema = z.string().min(1).max(64);
const nameSchema = z.string().trim().min(1).max(120);

export const subgroupSchema = z.object({
  id: idSchema,
  name: nameSchema,
  amount: z.number().finite(),
  assetClass: assetClassSchema.optional(),
});

export const groupSchema = z.object({
  id: idSchema,
  name: nameSchema,
  subgroups: z.array(subgroupSchema).max(200),
});

export const groupsSchema = z.array(groupSchema).max(100);

export const snapshotSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(120),
  date: z.string().datetime(),
  // subgroupId → importe en ese momento. Es un mapa plano, igual que en la app
  // original: los snapshots no guardan la estructura de grupos.
  values: z.record(idSchema, z.number().finite()),
});

/** Cuerpo del PUT /api/portfolio. `version` habilita el bloqueo optimista. */
export const savePortfolioSchema = z.object({
  groups: groupsSchema,
  version: z.number().int().nonnegative().optional(),
});

/** Cuerpo del POST /api/snapshots. La fecha y el total los pone el servidor. */
export const createSnapshotSchema = z.object({
  id: idSchema.optional(),
  label: z.string().trim().min(1).max(120).optional(),
  values: z.record(idSchema, z.number().finite()),
});

export const renameSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

export type AssetClassKey = z.infer<typeof assetClassSchema>;
export type Subgroup = z.infer<typeof subgroupSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;

export interface Portfolio {
  groups: Group[];
  version: number;
  updatedAt: string;
}

/** Lo que consume el cliente: cartera + histórico en una sola respuesta. */
export interface WealthData {
  groups: Group[];
  snapshots: Snapshot[];
  version: number;
}

export interface StorageInfo {
  mode: "dynamodb" | "memory";
  table?: string;
  region?: string;
}
