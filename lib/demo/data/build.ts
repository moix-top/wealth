// Constructor de carteras demo. Escribir a mano los `values` de cada snapshot
// (subgroupId → importe, por cada mes y cada partida) sería inmantenible y se
// llenaría de ids huérfanos, que es justo lo que rompería la pestaña Comparar.
// Aquí se declara la cartera de HOY y cómo se comportó cada clase de activo, y
// el histórico se deriva hacia atrás.

import type { AssetClassKey, Group, Snapshot, Subgroup } from "@/lib/types";

export interface DemoHolding {
  name: string;
  amount: number;
  assetClass: AssetClassKey;
  /**
   * Aportación mensual media. Al reconstruir el pasado se resta, de modo que el
   * histórico refleja que la cartera se fue construyendo, no que apareció hecha.
   */
  monthly?: number;
  /**
   * Sensibilidad al ciclo de mercado. 0 = ajeno (efectivo, vivienda tasada),
   * 1 = renta variable global, >1 = cripto o valores concentrados. Si no se
   * indica, se deduce de la clase de activo.
   */
  beta?: number;
}

export interface DemoGroupSpec {
  name: string;
  holdings: DemoHolding[];
}

/** Beta por defecto de cada clase, para no repetirla partida a partida. */
const BETA: Record<AssetClassKey, number> = {
  liquidez: 0,
  liquidez_sin: 0,
  efectivo: 0,
  monetario: 0.02,
  rf: 0.25,
  mixto: 0.6,
  rv: 1,
  cripto: 2.6,
  seguro: 0.35,
  inmueble: 0.12,
  bien: -0.15, // los vehículos se deprecian
  otro: 0.3,
};

/**
 * Ciclo de mercado de los últimos 12 meses, normalizado a 1 en el presente.
 * Corrección a mitad de año y recuperación posterior: da algo que mirar en
 * Evolución y diferencias con signo en Comparar.
 */
const CYCLE = [
  0.9, 0.925, 0.955, 0.98, 0.94, 0.895, 0.915, 0.95, 0.965, 0.985, 0.995, 1,
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

const slug = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export interface DemoPortfolio {
  groups: Group[];
  snapshots: Snapshot[];
}

/**
 * `months` snapshots mensuales, el último de hace unos días. Los ids son
 * deterministas (derivados del nombre) para que la siembra sea idempotente y
 * los tests puedan comprobar la correspondencia con los grupos.
 */
export function buildPortfolio(specs: DemoGroupSpec[], months = 10): DemoPortfolio {
  const groups: Group[] = specs.map((g, gi) => ({
    id: `g${gi + 1}-${slug(g.name)}`,
    name: g.name,
    subgroups: g.holdings.map((h, hi): Subgroup => ({
      id: `s${gi + 1}-${hi + 1}-${slug(h.name)}`,
      name: h.name,
      amount: round2(h.amount),
      assetClass: h.assetClass,
    })),
  }));

  const now = Date.now();
  const snapshots: Snapshot[] = [];

  for (let step = months - 1; step >= 0; step--) {
    const monthsAgo = step;
    const date = new Date(now - monthsAgo * 30 * 24 * 3600 * 1000);
    const cycle = CYCLE[CYCLE.length - 1 - Math.min(monthsAgo, CYCLE.length - 1)];

    const values: Record<string, number> = {};
    specs.forEach((g, gi) => {
      g.holdings.forEach((h, hi) => {
        const id = groups[gi].subgroups[hi].id;
        const beta = h.beta ?? BETA[h.assetClass];
        // Se deshacen las aportaciones y se aplica el ciclo según la beta.
        const contributed = (h.monthly ?? 0) * monthsAgo;
        const base = Math.max(h.amount - contributed, h.amount * 0.05);
        values[id] = round2(base * (1 + beta * (cycle - 1)));
      });
    });

    snapshots.push({
      id: `snap-${monthsAgo}`,
      label: date.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      date: date.toISOString(),
      values,
    });
  }

  return { groups, snapshots };
}

/** Total actual de una cartera demo, para comprobar la escala anunciada. */
export const portfolioTotal = (p: DemoPortfolio): number =>
  p.groups.reduce((a, g) => a + g.subgroups.reduce((b, s) => b + s.amount, 0), 0);
