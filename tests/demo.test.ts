// El modo demo escribe en el mismo almacén que los usuarios reales, así que lo
// que hay que garantizar es doble: que los fixtures son coherentes (un id
// huérfano en un snapshot rompería la pestaña Comparar sin avisar) y que cada
// visita trabaja sobre su propia partición.

import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_PROFILES,
  demoEmail,
  demoProfileOf,
  isDemoProfileId,
  isDemoUserId,
} from "@/lib/demo/profiles";
import { FIXTURES, seedDemoIfNeeded } from "@/lib/services/demoService";
import { getWealthData, resetMemory } from "@/lib/services/wealthService";
import { groupsSchema, snapshotSchema } from "@/lib/types";
import { portfolioTotal, type DemoPortfolio } from "@/lib/demo/data/build";

/** "2.700 M €" → 2_700_000_000; "46.000 €" → 46000. */
const parseNetWorth = (label: string): number => {
  const millions = label.includes("M");
  const n = Number(label.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return millions ? n * 1e6 : n;
};

const loadAll = async (): Promise<Array<{ id: string; data: DemoPortfolio }>> =>
  Promise.all(
    DEMO_PROFILES.map(async (p) => ({
      id: p.id,
      // Por el mismo mapa que usa la siembra: si un perfil se queda sin fichero,
      // el test falla aquí en vez de en producción.
      data: (await FIXTURES[p.id]()).default,
    })),
  );

describe("catálogo de perfiles", () => {
  it("no está vacío y los ids son únicos", () => {
    expect(DEMO_PROFILES.length).toBeGreaterThan(0);
    const ids = DEMO_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada perfil tiene su fichero de datos", async () => {
    const all = await loadAll();
    expect(all).toHaveLength(DEMO_PROFILES.length);
    all.forEach(({ data }) => expect(data.groups.length).toBeGreaterThan(0));
  });
});

describe("fixtures de demostración", () => {
  it("pasan los esquemas que valida la API", async () => {
    for (const { id, data } of await loadAll()) {
      expect(() => groupsSchema.parse(data.groups), id).not.toThrow();
      data.snapshots.forEach((s) => expect(() => snapshotSchema.parse(s), id).not.toThrow());
    }
  });

  it("todo importe de un snapshot apunta a una partida que existe", async () => {
    for (const { id, data } of await loadAll()) {
      const known = new Set(data.groups.flatMap((g) => g.subgroups.map((s) => s.id)));
      for (const snap of data.snapshots) {
        for (const subId of Object.keys(snap.values)) {
          expect(known.has(subId), `${id}: ${subId} no existe en los grupos`).toBe(true);
        }
      }
    }
  });

  it("los ids de partida no se repiten dentro de un perfil", async () => {
    for (const { id, data } of await loadAll()) {
      const ids = data.groups.flatMap((g) => g.subgroups.map((s) => s.id));
      expect(new Set(ids).size, id).toBe(ids.length);
    }
  });

  it("el histórico va de más antiguo a más reciente", async () => {
    for (const { id, data } of await loadAll()) {
      const dates = data.snapshots.map((s) => +new Date(s.date));
      expect([...dates].sort((a, b) => a - b), id).toEqual(dates);
    }
  });

  it("el patrimonio anunciado en el catálogo cuadra con los datos", async () => {
    // Margen amplio: la tarjeta redondea a una cifra legible, no al céntimo.
    for (const { id, data } of await loadAll()) {
      const expected = parseNetWorth(DEMO_PROFILES.find((p) => p.id === id)!.netWorth);
      const real = portfolioTotal(data);
      expect(Math.abs(real - expected) / expected, `${id}: ${real} vs ${expected}`).toBeLessThan(0.15);
    }
  });
});

describe("identidad de las sesiones demo", () => {
  it("reconoce los ids de demo y extrae su perfil", () => {
    const email = demoEmail("familyoffice", "abc123");
    expect(isDemoUserId(email)).toBe(true);
    expect(demoProfileOf(email)).toBe("familyoffice");
  });

  it("un email normal no es de demo", () => {
    expect(isDemoUserId("ana@example.com")).toBe(false);
    expect(demoProfileOf("ana@example.com")).toBeUndefined();
  });

  it("un perfil inventado no cuela", () => {
    expect(isDemoProfileId("no-existe")).toBe(false);
    expect(demoProfileOf(demoEmail("no-existe", "abc"))).toBeUndefined();
  });
});

describe("siembra", () => {
  beforeEach(() => resetMemory());

  it("rellena la cartera de una sesión demo vacía", async () => {
    const user = demoEmail("fire", "n1");
    expect(await seedDemoIfNeeded(user)).toBe(true);

    const data = await getWealthData(user);
    expect(data.groups.length).toBeGreaterThan(0);
    expect(data.snapshots.length).toBeGreaterThan(0);
  });

  it("es idempotente: no duplica nada al repetirse", async () => {
    const user = demoEmail("fire", "n2");
    await seedDemoIfNeeded(user);
    const first = await getWealthData(user);

    expect(await seedDemoIfNeeded(user)).toBe(false);
    const second = await getWealthData(user);

    expect(second.groups).toHaveLength(first.groups.length);
    expect(second.snapshots).toHaveLength(first.snapshots.length);
  });

  it("no toca a los usuarios reales", async () => {
    expect(await seedDemoIfNeeded("ana@example.com")).toBe(false);
    const data = await getWealthData("ana@example.com");
    expect(data.groups).toEqual([]);
  });

  it("dos visitas al mismo perfil no se ven entre sí", async () => {
    const a = demoEmail("peon", "aaa");
    const b = demoEmail("peon", "bbb");
    await seedDemoIfNeeded(a);
    await seedDemoIfNeeded(b);

    // A cambia su cartera; B debe seguir con la suya intacta.
    const { savePortfolio } = await import("@/lib/services/wealthService");
    await savePortfolio(a, []);

    expect((await getWealthData(a)).groups).toEqual([]);
    expect((await getWealthData(b)).groups.length).toBeGreaterThan(0);
  });
});
