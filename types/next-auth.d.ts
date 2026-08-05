// Extiende los tipos de Auth.js con el `sub` de Google que arrastramos en el
// token (auth.config.ts). No es el identificador de usuario —ese es el email—,
// solo sirve para detectar que un email cambia de cuenta de Google de origen.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      googleSub?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleSub?: string;
  }
}

export {};
