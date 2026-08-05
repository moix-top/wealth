// El test que más importa: que un usuario no pueda alcanzar los datos de otro.
//
// Corre en modo memoria (sin AWS_ACCESS_KEY_ID), pero el almacén en memoria
// replica la misma estructura pk → sk que DynamoDB y el servicio ejecuta el
// mismo camino de decisión, así que estos casos cubren la lógica de partición
// real, no una maqueta.

import { beforeEach, describe, expect, it } from "vitest";
import {
  createSnapshot,
  deleteSnapshot,
  getPortfolio,
  getWealthData,
  listSnapshots,
  renameSnapshot,
  resetMemory,
  savePortfolio,
} from "@/lib/services/wealthService";
import type { Group } from "@/lib/types";

const ANA = "ana@example.com";
const BEA = "bea@example.com";

const groupsOf = (name: string, amount: number): Group[] => [
  { id: "g1", name, subgroups: [{ id: "s1", name: "Cuenta", amount }] },
];

describe("aislamiento entre usuarios", () => {
  beforeEach(() => {
    resetMemory();
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  it("la cartera de uno no se ve desde el otro", async () => {
    await savePortfolio(ANA, groupsOf("Banco de Ana", 1000));

    expect((await getPortfolio(ANA)).groups[0].name).toBe("Banco de Ana");
    expect((await getPortfolio(BEA)).groups).toEqual([]);
  });

  it("guardar como uno no pisa lo del otro", async () => {
    await savePortfolio(ANA, groupsOf("Ana", 1000));
    await savePortfolio(BEA, groupsOf("Bea", 25));

    expect((await getPortfolio(ANA)).groups[0].subgroups[0].amount).toBe(1000);
    expect((await getPortfolio(BEA)).groups[0].subgroups[0].amount).toBe(25);
  });

  it("los snapshots no se cruzan", async () => {
    await createSnapshot(ANA, { id: "snap-ana", label: "De Ana", values: { s1: 1000 } });

    expect(await listSnapshots(ANA)).toHaveLength(1);
    expect(await listSnapshots(BEA)).toEqual([]);
  });

  it("borrar con el id de un snapshot ajeno da 404 y no lo toca", async () => {
    await createSnapshot(ANA, { id: "snap-ana", label: "De Ana", values: { s1: 1000 } });

    await expect(deleteSnapshot(BEA, "snap-ana")).rejects.toMatchObject({ status: 404 });
    expect(await listSnapshots(ANA)).toHaveLength(1);
  });

  it("renombrar con el id de un snapshot ajeno da 404 y no lo toca", async () => {
    await createSnapshot(ANA, { id: "snap-ana", label: "De Ana", values: { s1: 1000 } });

    await expect(renameSnapshot(BEA, "snap-ana", "Mío")).rejects.toMatchObject({ status: 404 });
    expect((await listSnapshots(ANA))[0].label).toBe("De Ana");
  });

  it("un usuario nuevo arranca vacío, no hereda nada", async () => {
    await savePortfolio(ANA, groupsOf("Ana", 1000));
    await createSnapshot(ANA, { values: { s1: 1000 } });

    expect(await getWealthData("nuevo@example.com")).toEqual({
      groups: [],
      snapshots: [],
      version: 0,
    });
  });

  it("un pk/sk inyectado en el input no altera dónde se escribe", async () => {
    // Un cliente malicioso podría mandar campos extra intentando reapuntar el
    // ítem. El servicio construye la clave a partir del userId y nada más.
    await createSnapshot(ANA, {
      id: "x",
      label: "intento",
      values: { s1: 1 },
      // @ts-expect-error campos que un atacante añadiría al body
      pk: `USER#${BEA}`,
      sk: "PORTFOLIO",
    });

    expect(await listSnapshots(BEA)).toEqual([]);
    expect(await listSnapshots(ANA)).toHaveLength(1);
    expect((await getPortfolio(BEA)).groups).toEqual([]);
  });
});

describe("bloqueo optimista de la cartera", () => {
  beforeEach(() => {
    resetMemory();
    delete process.env.AWS_ACCESS_KEY_ID;
  });

  it("la versión avanza en cada guardado", async () => {
    expect((await savePortfolio(ANA, groupsOf("A", 1))).version).toBe(1);
    expect((await savePortfolio(ANA, groupsOf("A", 2))).version).toBe(2);
  });

  it("guardar con una versión obsoleta da 409", async () => {
    await savePortfolio(ANA, groupsOf("A", 1), 0);
    // Segunda pestaña que aún cree estar en la versión 0.
    await expect(savePortfolio(ANA, groupsOf("A", 999), 0)).rejects.toMatchObject({ status: 409 });
    expect((await getPortfolio(ANA)).groups[0].subgroups[0].amount).toBe(1);
  });
});
