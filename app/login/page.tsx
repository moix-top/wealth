// Pantalla de login. Server component: el botón es una server action, así que
// no hace falta SessionProvider ni JS de cliente.
//
// El registro es abierto: quien entre por primera vez se da de alta solo, y sus
// datos quedan en su propio espacio, invisible para el resto.

import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "email-not-verified":
    "Tu cuenta de Google no tiene el email verificado. Verifícalo en Google y vuelve a intentarlo.",
  "no-email": "Google no ha devuelto ningún email para esa cuenta.",
  Configuration:
    "Falta configuración de acceso en el servidor (variables AUTH_*). Revisa las variables de entorno del despliegue.",
  AccessDenied: "Acceso denegado.",
  Verification: "El enlace de acceso ha caducado. Inténtalo otra vez.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const session = await auth();
  if (session?.user?.email) redirect("/");

  const error = searchParams.error
    ? ERRORS[searchParams.error] ?? "No se pudo iniciar sesión."
    : null;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Mi Patrimonio</h1>
        <p className="login-sub">
          Controla tus finanzas personales. Entra con tu cuenta de Google: tus datos son solo
          tuyos y nadie más puede verlos.
        </p>

        {error && <p className="login-error">{error}</p>}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: searchParams.callbackUrl || "/" });
          }}
        >
          <button type="submit" className="login-button">
            Entrar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
