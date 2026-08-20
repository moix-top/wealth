// Carga inicial: cartera + snapshots del usuario de la sesión, en una sola
// respuesta (el cliente arranca con todo, como hacía el GET /api/data original).
//
// Es también el punto donde se da de alta al usuario la primera vez que entra,
// y donde se siembra la cartera de las sesiones de demostración.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { demoProfileOf } from "@/lib/demo/profiles";
import { jsonError } from "@/lib/http";
import { seedDemoIfNeeded } from "@/lib/services/demoService";
import { ensureUser, getWealthData, storageInfo } from "@/lib/services/wealthService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId, googleSub, name, image, email } = await requireSession();
    await ensureUser(userId, googleSub);
    // Solo hace algo si es una sesión demo con la cartera vacía.
    await seedDemoIfNeeded(userId);
    const data = await getWealthData(userId);
    const demoProfile = demoProfileOf(userId);
    return NextResponse.json({
      ...data,
      user: { email, name, image, demo: Boolean(demoProfile), demoProfile },
      storage: storageInfo(),
    });
  } catch (e) {
    return jsonError(e);
  }
}
