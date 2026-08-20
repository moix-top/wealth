// Siembra del modo demo. Reutiliza el servicio normal (savePortfolio /
// createSnapshot): nada aquí escribe en DynamoDB por su cuenta, así que las
// invariantes de aislamiento de wealthService siguen siendo las de siempre.

import { isDemoUserId, demoProfileOf } from "@/lib/demo/profiles";
import type { Group, Snapshot } from "@/lib/types";
import { createSnapshot, getPortfolio, savePortfolio } from "@/lib/services/wealthService";

interface DemoPortfolio {
  groups: Group[];
  snapshots: Snapshot[];
}

/**
 * Los fixtures se cargan en diferido y solo cuando hace falta sembrar: son unos
 * cuantos kilobytes de datos que no pintan nada en el arranque del servidor.
 *
 * El mapa es explícito, con rutas literales, en vez de un import() con la
 * variable dentro: los bundlers no pueden analizar una ruta dinámica y acaban
 * metiendo el directorio entero —o ninguno— en el bundle.
 */
export const FIXTURES: Record<string, () => Promise<{ default: DemoPortfolio }>> = {
  peon: () => import("@/lib/demo/data/peon"),
  sanitaria: () => import("@/lib/demo/data/sanitaria"),
  pareja: () => import("@/lib/demo/data/pareja"),
  autonomo: () => import("@/lib/demo/data/autonomo"),
  fire: () => import("@/lib/demo/data/fire"),
  rentista: () => import("@/lib/demo/data/rentista"),
  familyoffice: () => import("@/lib/demo/data/familyoffice"),
  fundador: () => import("@/lib/demo/data/fundador"),
};

async function loadFixture(profileId: string): Promise<DemoPortfolio | null> {
  const load = FIXTURES[profileId];
  if (!load) return null;
  return (await load()).default;
}

/**
 * Rellena la cartera de una sesión demo recién creada.
 *
 * Idempotente por partida doble: solo actúa si el usuario es demo Y su cartera
 * está vacía. Si el visitante borra todos sus grupos, la demo se resiembra en
 * la siguiente carga, que es el comportamiento deseable para una demostración.
 *
 * Devuelve true si ha sembrado algo (el llamante debe releer los datos).
 */
export async function seedDemoIfNeeded(userId: string): Promise<boolean> {
  if (!isDemoUserId(userId)) return false;

  const profileId = demoProfileOf(userId);
  if (!profileId) return false;

  const current = await getPortfolio(userId);
  if (current.groups.length > 0) return false;

  const fixture = await loadFixture(profileId);
  if (!fixture) return false;

  await savePortfolio(userId, fixture.groups);
  // En orden cronológico: la sk de cada snapshot lleva la fecha, y así el
  // histórico queda ordenado igual que si se hubieran ido tomando de verdad.
  for (const snap of fixture.snapshots) {
    await createSnapshot(userId, {
      id: snap.id,
      label: snap.label,
      values: snap.values,
      date: snap.date,
    });
  }
  return true;
}
