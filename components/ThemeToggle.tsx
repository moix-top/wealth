"use client";

// Selector de tema: auto (sigue al sistema) → claro → oscuro. El valor vive en
// localStorage y se aplica como data-theme en <html>; el script inline de
// layout.tsx lo restaura antes del primer pintado.

import { useEffect, useState } from "react";

type Theme = "auto" | "light" | "dark";

const NEXT: Record<Theme, Theme> = { auto: "light", light: "dark", dark: "auto" };
const ICON: Record<Theme, string> = { auto: "🌗", light: "☀️", dark: "🌙" };
const LABEL: Record<Theme, string> = { auto: "automático", light: "claro", dark: "oscuro" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  // El estado real lo fijó el script inline: aquí solo se lee para que el
  // botón muestre el icono correcto tras la hidratación.
  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    try {
      if (next === "auto") {
        localStorage.removeItem("theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
    } catch {
      // Modo privado sin storage: el tema se aplica igual, solo no persiste.
    }
  };

  return (
    <button
      className="btn ghost sm theme-toggle"
      onClick={cycle}
      title={`Tema: ${LABEL[theme]}`}
      aria-label={`Cambiar tema (actual: ${LABEL[theme]})`}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
    </button>
  );
}
