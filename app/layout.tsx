import type { Metadata } from "next";
import "./globals.css";

// Las páginas leen la sesión (cookies): nada de prerender estático, que además
// haría fallar el build cuando no hay variables AUTH_* definidas (CI).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi Patrimonio",
  description: "Control de finanzas personales: patrimonio por grupos, clases de activo y evolución.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
