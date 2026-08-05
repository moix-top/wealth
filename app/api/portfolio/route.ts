// Cartera (grupos y subgrupos) del usuario de la sesión.
//
// PUT escribe el documento entero, igual que el store original: las mutaciones
// del cliente son inmutables sobre el árbol completo, así que reconstruirlo
// campo a campo en el servidor no aportaría nada. Lo que sí se añade es
// validación zod (antes no había ninguna) y bloqueo optimista por `version`.

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getPortfolio, savePortfolio } from "@/lib/services/wealthService";
import { savePortfolioSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireSession();
    return NextResponse.json(await getPortfolio(userId));
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await requireSession();
    // Cualquier pk/sk/userId que venga en el body cae aquí: el esquema es
    // estricto en lo que consume y savePortfolio solo recibe `groups`.
    const body = savePortfolioSchema.parse(await request.json());
    const saved = await savePortfolio(userId, body.groups, body.version);
    return NextResponse.json(saved);
  } catch (e) {
    return jsonError(e);
  }
}
