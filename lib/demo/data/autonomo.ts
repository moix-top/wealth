// Iván Redondo, autónomo con sociedad. Personaje ficticio; instrumentos reales.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Tesorería de la sociedad",
    holdings: [
      { name: "Cuenta empresa Bankinter", amount: 42300.5, assetClass: "liquidez_sin" },
      { name: "Groupama Trésorerie IC (TER 0,15 %)", amount: 85000, assetClass: "monetario", monthly: 1500 },
      { name: "Letras del Tesoro a 12 meses", amount: 60000, assetClass: "rf" },
    ],
  },
  {
    name: "Patrimonio personal · Renta 4",
    holdings: [
      {
        name: "Vanguard Global Stock Index Fund EUR Acc · IE00B03HD191",
        amount: 96400.25,
        assetClass: "rv",
        monthly: 1200,
      },
      { name: "Vanguard Global Bond Index Fund EUR Hedged", amount: 31200, assetClass: "rf", monthly: 300 },
      { name: "Plan de pensiones autónomos", amount: 24800.7, assetClass: "mixto", monthly: 250 },
    ],
  },
  {
    name: "Inmuebles",
    holdings: [
      { name: "Local comercial alquilado (Valladolid)", amount: 118000, assetClass: "inmueble" },
    ],
  },
  {
    name: "Otros",
    holdings: [
      { name: "Efectivo", amount: 1500, assetClass: "efectivo" },
      { name: "Invesco Physical Gold ETC · IE00B579F325", amount: 14200, assetClass: "otro" },
      { name: "Furgón de trabajo Ford Transit", amount: 16500, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
