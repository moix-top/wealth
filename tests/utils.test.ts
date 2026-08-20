// Lógica pura portada de la app original: si esto cambia de comportamiento, las
// cifras que ve el usuario cambian.

import { describe, expect, it } from "vitest";
import { assetClassOf, groupTotal, pct, snapshotTotal } from "@/lib/utils";
import { savePortfolioSchema, snapshotSchema } from "@/lib/types";

describe("totales", () => {
  it("groupTotal suma los subgrupos", () => {
    expect(
      groupTotal({
        id: "g",
        name: "G",
        subgroups: [
          { id: "a", name: "A", amount: 10.5 },
          { id: "b", name: "B", amount: 4.5 },
        ],
      }),
    ).toBe(15);
  });

  it("snapshotTotal ignora los ids que no están en el snapshot", () => {
    // Un subgrupo creado después de un snapshot antiguo cuenta como 0, no
    // rompe el total. Es el comportamiento del original y hay que conservarlo.
    const snap = { id: "s", label: "l", date: "2026-01-01T00:00:00.000Z", values: { a: 100 } };
    expect(snapshotTotal(snap, ["a", "nuevo"])).toBe(100);
  });

  it("pct maneja el caso de partir de cero", () => {
    expect(pct(0, 50)).toBe(100);
    expect(pct(0, 0)).toBe(0);
    expect(pct(100, 150)).toBe(50);
  });
});

describe("assetClassOf", () => {
  it("la clase explícita gana a la heurística", () => {
    expect(assetClassOf({ name: "ETF Vanguard", assetClass: "liquidez" })).toBe("liquidez");
  });

  it("infiere por el nombre cuando no hay clase", () => {
    expect(assetClassOf({ name: "ETF Vanguard S&P 500" })).toBe("rv");
    expect(assetClassOf({ name: "Cuenta Nómina" })).toBe("liquidez_sin");
    expect(assetClassOf({ name: "Cuenta Ahorro Remunerada" })).toBe("liquidez");
    expect(assetClassOf({ name: "Efectivo en casa" })).toBe("efectivo");
    expect(assetClassOf({ name: "Fidelity Physical Bitcoin" })).toBe("cripto");
  });

  it("usa el nombre del grupo como contexto si el propio no dice nada", () => {
    expect(assetClassOf({ name: "Nissan NV200" })).toBe("otro");
    expect(assetClassOf({ name: "Nissan NV200" }, "Coches")).toBe("bien");
  });

  it("cae en 'otro' cuando no reconoce nada", () => {
    expect(assetClassOf({ name: "Zzzz" })).toBe("otro");
  });
});

describe("validación de entrada", () => {
  it("rechaza importes no numéricos", () => {
    const bad = { groups: [{ id: "g", name: "G", subgroups: [{ id: "s", name: "S", amount: "10" }] }] };
    expect(savePortfolioSchema.safeParse(bad).success).toBe(false);
  });

  it("rechaza nombres vacíos", () => {
    const bad = { groups: [{ id: "g", name: "   ", subgroups: [] }] };
    expect(savePortfolioSchema.safeParse(bad).success).toBe(false);
  });

  it("acepta una cartera válida", () => {
    const ok = {
      groups: [{ id: "g", name: "ING", subgroups: [{ id: "s", name: "Nómina", amount: 2215.42 }] }],
      version: 3,
    };
    expect(savePortfolioSchema.safeParse(ok).success).toBe(true);
  });

  it("exige fecha ISO en los snapshots (los ordena por sk)", () => {
    expect(
      snapshotSchema.safeParse({ id: "a", label: "l", date: "ayer", values: {} }).success,
    ).toBe(false);
  });
});
