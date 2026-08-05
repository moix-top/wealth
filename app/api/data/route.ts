// Carga inicial: cartera + snapshots del usuario de la sesión, en una sola
// respuesta (el cliente arranca con todo, como hacía el GET /api/data original).
//
// Es también el punto donde se da de alta al usuario la primera vez que entra.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { ensureUser, getWealthData, storageInfo } from "@/lib/services/wealthService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId, googleSub, name, image, email } = await requireSession();
    await ensureUser(userId, googleSub);
    const data = await getWealthData(userId);
    return NextResponse.json({ ...data, user: { email, name, image }, storage: storageInfo() });
  } catch (e) {
    return jsonError(e);
  }
}
