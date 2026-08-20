// Configuración de Auth.js v5 (next-auth@5). Va separada de auth.ts porque
// ESTE fichero lo importa el middleware, que corre en Edge Runtime.
//
// ⚠️  REGLA: aquí no puede entrar NADA que arrastre @aws-sdk/* (ni lib/dynamo.ts
// ni lib/services/*). El bundle de Edge no tiene `fs` y el build falla con
// "Module not found". Solo next-auth y lógica pura.

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { demoEmail, findDemoProfile } from "@/lib/demo/profiles";

// El perfil de Google trae email_verified, pero el tipo `Profile` de Auth.js no
// lo declara (es específico de cada proveedor). Cast acotado en vez de `any`.
interface GoogleProfile {
  sub?: string;
  email?: string | null;
  email_verified?: boolean;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      // Defaults vacíos para que construir la config no reviente sin variables:
      // el build de CI no tiene credenciales. Falla en el flujo, no al importar.
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      // Sin esto, un navegador con una sola sesión de Google reintenta siempre
      // la misma cuenta y no hay forma de cambiarla.
      authorization: { params: { prompt: "select_account" } },
    }),

    // Modo demo. Credentials es el único proveedor que exige sesión JWT, que es
    // justo la que ya usamos. No valida contraseña alguna: lo único que acepta
    // es un id del catálogo, y a cambio entrega una identidad desechable.
    //
    // El nonce es lo que hace que cada visitante trabaje sobre SU copia: el
    // email es la clave de partición (lib/auth.ts), así que dos personas en el
    // mismo perfil no se pisan.
    Credentials({
      id: "demo",
      name: "Modo demo",
      credentials: { profileId: { label: "Perfil", type: "text" } },
      authorize(credentials) {
        const profile = findDemoProfile(String(credentials?.profileId ?? ""));
        if (!profile) return null;
        const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const email = demoEmail(profile.id, nonce);
        return { id: email, email, name: profile.name };
      },
    }),
  ],

  // Sesión en JWT firmado, sin adaptador de base de datos: los datos del
  // usuario viven en DynamoDB bajo su email, la sesión solo transporta quién es.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: { signIn: "/login" },

  // La URL de callback se deriva del Host de cada petición. Ver AUTH_TRUST_HOST
  // en .env.example: no definir AUTH_URL.
  trustHost: true,

  callbacks: {
    // Registro ABIERTO: entra cualquiera con cuenta de Google. Lo único
    // innegociable es que el email esté verificado: el email es la clave de
    // partición en DynamoDB, así que aceptar uno sin verificar permitiría
    // reclamar los datos de otra persona con solo declarar su dirección.
    signIn({ account, profile }) {
      // El proveedor demo no trae `profile`: sin esta salida temprana caería en
      // la comprobación de Google y se rechazaría como "no-email".
      if (account?.provider === "demo") return true;
      const google = profile as GoogleProfile | undefined;
      if (!google?.email) return "/login?error=no-email";
      return google.email_verified === true ? true : "/login?error=email-not-verified";
    },

    // El `sub` de Google se arrastra en el token para poder detectar en el
    // servidor si un email dado cambia de cuenta de origen (ver ensureUser).
    jwt({ token, account, profile }) {
      const google = profile as GoogleProfile | undefined;
      if (google?.sub) token.googleSub = google.sub;
      // El flag va en el token, no se deduce del email en el cliente: así la UI
      // no tiene que conocer el formato del identificador demo.
      if (account?.provider === "demo") token.demo = true;
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.googleSub = token.googleSub as string | undefined;
        session.user.demo = token.demo === true;
      }
      return session;
    },

    // Lo usa el middleware. Las rutas de API se dejan pasar aposta: deben
    // responder 401 JSON (vía requireSession), no un redirect HTML.
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/api/")) return true;
      return Boolean(auth?.user);
    },
  },
};
