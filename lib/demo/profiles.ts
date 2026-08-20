// Catálogo del modo demo. Este fichero lo importa auth.config.ts, que corre en
// Edge Runtime: aquí NO puede entrar nada de @/lib/services ni @aws-sdk (ver la
// regla en la cabecera de auth.config.ts). Solo metadatos y lógica pura.
//
// Los personajes son FICTICIOS. Lo real son los instrumentos: fondos, ETFs,
// ISIN, TER, bancos y brókeres que existen de verdad. No se atribuyen carteras
// ni cifras a ninguna persona identificable.

export interface DemoProfile {
  id: string;
  /** Nombre del personaje ficticio. */
  name: string;
  /** Ocupación / titular de una línea. */
  headline: string;
  /** Qué enseña este perfil. */
  blurb: string;
  /** Patrimonio aproximado, ya formateado para la tarjeta del catálogo. */
  netWorth: string;
  icon: string;
}

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "peon",
    name: "Rubén Cortés",
    headline: "Peón de obra, 34 años",
    blurb: "Empezando de cero: nómina, un sobre con efectivo y su primer fondo indexado.",
    netWorth: "9.500 €",
    icon: "🧱",
  },
  {
    id: "sanitaria",
    name: "Nerea Aguilar",
    headline: "Técnica sanitaria, 29 años",
    blurb: "Colchón de emergencia hecho y aportaciones mensuales al MSCI World.",
    netWorth: "46.000 €",
    icon: "🩺",
  },
  {
    id: "pareja",
    name: "Marta y Diego",
    headline: "Pareja con hipoteca, 41 y 43",
    blurb: "El patrimonio típico español: la vivienda pesa más que todo lo demás junto.",
    netWorth: "250.000 €",
    icon: "🏡",
  },
  {
    id: "autonomo",
    name: "Iván Redondo",
    headline: "Autónomo con sociedad, 47 años",
    blurb: "Tesorería de empresa en monetarios y un local comercial alquilado.",
    netWorth: "490.000 €",
    icon: "🧾",
  },
  {
    id: "fire",
    name: "Claudia Bengoa",
    headline: "Ingeniera senior, camino del FIRE",
    blurb: "Indexación pura y tasa de ahorro alta: pocas partidas, mucha disciplina.",
    netWorth: "1,2 M €",
    icon: "🔥",
  },
  {
    id: "rentista",
    name: "Dr. Alfonso Vilar",
    headline: "Médico jubilado, vive de rentas",
    blurb: "Renta fija, dividendos, SOCIMIs y oro: la cartera pasa a modo conservación.",
    netWorth: "3,2 M €",
    icon: "🪙",
  },
  {
    id: "familyoffice",
    name: "Serrano-Vidal",
    headline: "Family office familiar",
    blurb: "Las doce clases de activo en uso, con capital riesgo, arte e infraestructura.",
    netWorth: "27 M €",
    icon: "🏛️",
  },
  {
    id: "fundador",
    name: "Elena Krauss",
    headline: "Fundadora tecnológica tras vender",
    blurb: "Concentración extrema en su participación, fundación propia y venture.",
    netWorth: "2.700 M €",
    icon: "🚀",
  },
];

export const isDemoProfileId = (id: string | undefined | null): boolean =>
  Boolean(id) && DEMO_PROFILES.some((p) => p.id === id);

export const findDemoProfile = (id: string): DemoProfile | undefined =>
  DEMO_PROFILES.find((p) => p.id === id);

/** Dominio reservado del modo demo. Nadie puede tener un email real aquí. */
export const DEMO_DOMAIN = "mipatrimonio.demo";

/**
 * Identidad de una sesión demo. El nonce es lo que da a cada visitante su propia
 * copia de la cartera: el email es la clave de partición (ver lib/auth.ts), así
 * que dos sesiones del mismo perfil no se ven entre sí.
 */
export const demoEmail = (profileId: string, nonce: string): string =>
  `demo+${profileId}+${nonce}@${DEMO_DOMAIN}`;

export const isDemoUserId = (userId: string): boolean => userId.endsWith(`@${DEMO_DOMAIN}`);

/** Perfil al que pertenece un userId demo, o undefined si no lo es. */
export const demoProfileOf = (userId: string): string | undefined => {
  if (!isDemoUserId(userId)) return undefined;
  const id = userId.split("+")[1];
  return isDemoProfileId(id) ? id : undefined;
};
