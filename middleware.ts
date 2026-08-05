// Protege la UI: sin sesión, a /login. Usa solo auth.config.ts (edge-safe), no
// auth.ts, porque el middleware corre en Edge Runtime y no puede arrastrar el
// SDK de AWS.
//
// Las rutas de API quedan fuera aposta (el callback `authorized` las deja
// pasar): deben responder 401 JSON vía requireSession, no un redirect HTML.

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Todo salvo: los propios endpoints de Auth.js (si no, bucle de redirects),
  // la pantalla de login, los estáticos de Next y el favicon.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
