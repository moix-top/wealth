// Histórico de snapshots del usuario de la sesión.
//
// A diferencia del original (que metía todo el histórico dentro del mismo
// documento), cada snapshot es un ítem propio: el tamaño no crece sin límite y
// la lista viene ya ordenada por fecha desde la sk.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { createSnapshot, listSnapshots } from "@/lib/services/wealthService";
import { createSnapshotSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireSession();
    return NextResponse.json(await listSnapshots(userId));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireSession();
    const body = createSnapshotSchema.parse(await request.json());
    // La fecha la pone el servidor: es la que ordena el histórico, no puede
    // depender del reloj del cliente.
    const snapshot = await createSnapshot(userId, { ...body, date: new Date().toISOString() });
    return NextResponse.json(snapshot, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
