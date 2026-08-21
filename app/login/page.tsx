// Pantalla de login. Server component: los botones son server actions, así que
// no hace falta SessionProvider ni JS de cliente. El catálogo de demos es otra
// vista de la misma página (?demo=1), no una ruta aparte, para que compartan
// tarjeta y estilos.
//
// El registro es abierto: quien entre por primera vez se da de alta solo, y sus
// datos quedan en su propio espacio, invisible para el resto.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { DEMO_PROFILES } from "@/lib/demo/profiles";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "email-not-verified":
    "Tu cuenta de Google no tiene el email verificado. Verifícalo en Google y vuelve a intentarlo.",
  "no-email": "Google no ha devuelto ningún email para esa cuenta.",
  Configuration:
    "Falta configuración de acceso en el servidor (variables AUTH_*). Revisa las variables de entorno del despliegue.",
  AccessDenied: "Acceso denegado.",
  Verification: "El enlace de acceso ha caducado. Inténtalo otra vez.",
  CredentialsSignin: "No se ha podido abrir esa demo. Elige otro perfil.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string; demo?: string };
}) {
  const session = await auth();
  if (session?.user?.email) redirect("/");

  const error = searchParams.error
    ? ERRORS[searchParams.error] ?? "No se pudo iniciar sesión."
    : null;

  const callbackUrl = searchParams.callbackUrl || "/";

  if (searchParams.demo) {
    return <DemoCatalog error={error} callbackUrl={callbackUrl} />;
  }

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
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button type="submit" className="login-button">
            Entrar con Google
          </button>
        </form>

        <Link className="login-secondary" href="/login?demo=1">
          Ver una demo sin registrarse
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}

function DemoCatalog({ error, callbackUrl }: { error: string | null; callbackUrl: string }) {
  return (
    <div className="login-wrap">
      <div className="login-card login-card-wide">
        <h1>Elige un perfil de demostración</h1>
        <p className="login-sub">
          Entras con una copia propia de la cartera: puedes editarla, crear snapshots y borrar lo
          que quieras. Al salir se descarta y nadie más ve tus cambios.
        </p>

        {error && <p className="login-error">{error}</p>}

        <ul className="demo-grid">
          {DEMO_PROFILES.map((p) => (
            <li key={p.id}>
              <form
                action={async () => {
                  "use server";
                  await signIn("demo", { profileId: p.id, redirectTo: callbackUrl });
                }}
              >
                <button type="submit" className="demo-card">
                  <span className="demo-icon" aria-hidden="true">
                    {p.icon}
                  </span>
                  <span className="demo-body">
                    <span className="demo-headline">{p.headline}</span>
                    <span className="demo-name">{p.name}</span>
                    <span className="demo-blurb">{p.blurb}</span>
                  </span>
                  <span className="demo-worth">{p.netWorth}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>

        {/* Los personajes son inventados; lo que es real son los fondos, ETFs,
            ISIN y entidades. Conviene que quede dicho en la propia pantalla. */}
        <p className="demo-disclaimer">
          Perfiles ficticios con fines demostrativos. Los productos financieros que aparecen
          (fondos, ETFs, ISIN y entidades) sí son reales; los importes y las personas, no.
        </p>

        <Link className="login-secondary" href="/login">
          ← Volver
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
