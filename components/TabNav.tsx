"use client";

// Lista de secciones, compartida por la barra de pestañas de escritorio y la
// barra inferior de móvil, para que no se dupliquen ni se desincronicen.

export const TABS = [
  { id: "dashboard", label: "Resumen", short: "Resumen", icon: "🥧" },
  { id: "assets", label: "Clases", short: "Clases", icon: "🧩" },
  { id: "compare", label: "Comparar", short: "Comparar", icon: "⚖️" },
  { id: "evolution", label: "Evolución", short: "Evol.", icon: "📈" },
  { id: "snapshots", label: "Snapshots", short: "Snaps", icon: "📸" },
  { id: "editor", label: "Editar", short: "Editar", icon: "✏️" },
] as const;

interface Props {
  tab: string;
  onSelect: (id: string) => void;
  /** "tabs" = fila del header (escritorio); "tabbar" = barra inferior (móvil). */
  variant: "tabs" | "tabbar";
}

export default function TabNav({ tab, onSelect, variant }: Props) {
  const bar = variant === "tabbar";
  return (
    <nav className={bar ? "tabbar" : "tabs"} aria-label="Secciones">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            className={(bar ? "tabbar-btn" : "tab") + (active ? " active" : "")}
            onClick={() => onSelect(t.id)}
            aria-current={active ? "page" : undefined}
          >
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tab-label">{bar ? t.short : t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
