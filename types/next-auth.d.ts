// Extiende los tipos de Auth.js con lo que arrastramos en el token
// (auth.config.ts): el `sub` de Google —que no es el identificador de usuario,
// ese es el email, sino la forma de detectar que un email cambia de cuenta de
// origen— y el marcador de sesión de demostración.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      googleSub?: string;
      /** Sesión del modo demo: datos ficticios y desechables. */
      demo?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleSub?: string;
    demo?: boolean;
  }
}

export {};
