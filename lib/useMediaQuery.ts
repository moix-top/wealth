"use client";

// Los gráficos de Recharts necesitan medidas en números (alto del contenedor,
// ancho del eje Y): eso no se puede resolver desde CSS, así que se lee el mismo
// breakpoint que usa globals.css. Empieza en `false` para que el HTML del
// servidor y el del primer render del cliente coincidan.

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Breakpoints compartidos con globals.css. */
export const useIsMobile = () => useMediaQuery("(max-width: 560px)");
export const useIsNarrow = () => useMediaQuery("(max-width: 820px)");
