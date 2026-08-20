// Formateo y helpers de presentación. Portado de src/utils.js sin cambios de
// lógica, salvo tipado y lo indicado en assetClassOf.

import { ASSET_CLASS_KEYS, type AssetClassKey, type Group, type Snapshot, type Subgroup } from "@/lib/types";

export const fmt = (n: number | undefined | null): string =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n || 0);

// `short` omite la hora y acorta el año: en móvil la fecha completa
// ("06/08/2025, 00:21") no cabe en la tabla del histórico.
export const fmtDate = (iso: string, short = false): string =>
  new Date(iso).toLocaleString(
    "es-ES",
    short
      ? { day: "2-digit", month: "2-digit", year: "2-digit" }
      : { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );

/** Importe abreviado para ejes de gráfico, donde no cabe el formato completo. */
export const fmtCompact = (n: number): string =>
  new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n || 0);

export const fmtSign = (n: number): string =>
  (n > 0 ? "+" : "") +
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export const pct = (from: number, to: number): number => {
  if (!from) return to ? 100 : 0;
  return ((to - from) / from) * 100;
};

// Paleta categórica validada (dataviz skill), orden fijo por CVD-safety.
// Se usa la variante clara; el CSS ajusta el resto de la UI a claro/oscuro.
export const PALETTE = [
  "#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7",
  "#e34948", "#e87ba4", "#eb6834",
];
// Con >8 grupos añadimos tonos derivados manteniendo el orden base.
const EXTRA = ["#256abf", "#199e70", "#c98500", "#9085e9", "#d55181", "#d95926", "#5598e7"];
const ALL = [...PALETTE, ...EXTRA];
export const colorFor = (i: number): string => ALL[i % ALL.length];

/** Total actual de un grupo (desde subgroups.amount). */
export const groupTotal = (g: Group): number =>
  g.subgroups.reduce((a, s) => a + (s.amount || 0), 0);

/** Total del snapshot para un conjunto de subgroupIds. */
export const snapshotTotal = (snap: Snapshot | undefined, subIds: string[]): number =>
  subIds.reduce((a, id) => a + (snap?.values?.[id] || 0), 0);

/** Valor de un subgrupo en un snapshot; 0 si es anterior a su creación. */
export const snapshotValue = (snap: Snapshot | undefined, id: string): number =>
  snap?.values?.[id] || 0;

// --- Clases de activo ---
export const ASSET_CLASSES: Record<AssetClassKey, { label: string; color: string }> = {
  liquidez:     { label: "Liquidez remunerado",    color: "#2a78d6" },
  liquidez_sin: { label: "Liquidez sin remunerar", color: "#7fb2ea" },
  efectivo:     { label: "Efectivo",               color: "#5aa02c" },
  monetario:    { label: "Monetario",              color: "#1baf7a" },
  rf:           { label: "Renta fija",             color: "#eda100" },
  mixto:        { label: "Mixto",                  color: "#008300" },
  rv:           { label: "Renta variable",         color: "#4a3aa7" },
  cripto:       { label: "Cripto",                 color: "#e34948" },
  seguro:       { label: "Seguro / PIAS",          color: "#e87ba4" },
  inmueble:     { label: "Inmueble",               color: "#eb6834" },
  bien:         { label: "Bien / vehículo",        color: "#256abf" },
  otro:         { label: "Otro",                   color: "#898781" },
};
export const ASSET_ORDER = [...ASSET_CLASS_KEYS];

/**
 * Heurística de respaldo por nombre para partidas sin clase asignada.
 *
 * En la app original era la vía principal de clasificación, y sus patrones
 * salían de los nombres de cuentas de un único usuario. Siendo multiusuario eso
 * no se sostiene: la clase se persiste explícitamente (selector en Editar, y el
 * script de import la escribe de una vez para los datos históricos). Esto queda
 * solo como red de seguridad genérica, sin nombres de entidades concretas.
 */
const DEFAULTS: Array<[RegExp, AssetClassKey]> = [
  [/remunerad|ahorro/i, "liquidez"],
  [/efectivo|billetes|metálico|metalico|cash/i, "efectivo"],
  [/cuenta|corriente|nómina|nomina|liquidez/i, "liquidez_sin"],
  [/monetari|money market|tresorerie/i, "monetario"],
  [/renta fija|bono|bonos|deuda|letra/i, "rf"],
  [/mixto|balanced/i, "mixto"],
  [/etf|acci(o|ó)n|acciones|fondo|index|msci|s&p|sp ?500|renta variable|equity/i, "rv"],
  [/bitcoin|ethereum|btc|eth|cripto|crypto/i, "cripto"],
  [/pias|unit ?linked|seguro/i, "seguro"],
  [/piso|vivienda|inmueble|garaje|local/i, "inmueble"],
  [/coche|veh(i|í)culo|moto/i, "bien"],
];

/**
 * `groupName` da contexto cuando el nombre de la partida por sí solo no dice
 * nada ("Nissan NV200" dentro del grupo "Coches", "Euro" dentro de "Revolut").
 * Se prueba primero el nombre propio, que es más específico.
 */
export const assetClassOf = (
  sub: Pick<Subgroup, "name" | "assetClass">,
  groupName?: string,
): AssetClassKey => {
  if (sub.assetClass && ASSET_CLASSES[sub.assetClass]) return sub.assetClass;
  const hit =
    DEFAULTS.find(([re]) => re.test(sub.name)) ??
    (groupName ? DEFAULTS.find(([re]) => re.test(groupName)) : undefined);
  return hit ? hit[1] : "otro";
};
