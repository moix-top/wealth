// Renombrar y borrar un snapshot concreto.
//
// 🔒 El `id` de la URL NO identifica al propietario: el servicio lo busca solo
// dentro de la partición del usuario de la sesión, así que el id de un snapshot
// ajeno se comporta exactamente igual que uno inexistente → 404.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { deleteSnapshot, renameSnapshot } from "@/lib/services/wealthService";
import { renameSnapshotSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    const { label } = renameSnapshotSchema.parse(await request.json());
    return NextResponse.json(await renameSnapshot(userId, params.id, label));
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireSession();
    await deleteSnapshot(userId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
