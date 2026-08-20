import type { Metadata, Viewport } from "next";
import "./globals.css";

// Las páginas leen la sesión (cookies): nada de prerender estático, que además
// haría fallar el build cuando no hay variables AUTH_* definidas (CI).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi Patrimonio",
  description: "Control de finanzas personales: patrimonio por grupos, clases de activo y evolución.",
};

// `viewport-fit: cover` hace falta para que env(safe-area-inset-*) tenga valor
// y la barra de navegación inferior no quede bajo el notch/indicador de iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema guardado antes del primer pintado. Sin esto, con el tema
// manual en oscuro y el sistema en claro, se ve un flash blanco en cada carga.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
