// Marta y Diego, pareja con hipoteca. Personajes ficticios; instrumentos reales.
// El peso aplastante de la vivienda es deliberado: es el patrimonio español típico.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Vivienda",
    holdings: [
      // Valor neto, no la tasación: el donut ignora los importes negativos, así
      // que meter la hipoteca como partida aparte descuadraría los porcentajes.
      { name: "Piso en Alcorcón (312.000 € tasado − 168.400 € de hipoteca)", amount: 143600, assetClass: "inmueble", monthly: 620 },
      { name: "Plaza de garaje", amount: 21000, assetClass: "inmueble" },
    ],
  },
  {
    name: "Banco Santander",
    holdings: [
      { name: "Cuenta nómina conjunta", amount: 5620.4, assetClass: "liquidez_sin" },
      { name: "Depósito 12 meses (2,25 % TAE)", amount: 12000, assetClass: "liquidez" },
    ],
  },
  {
    name: "Indexa Capital",
    holdings: [
      { name: "Cartera 7/10 (Vanguard Global Stock + Global Bond)", amount: 27400.9, assetClass: "mixto", monthly: 400 },
      { name: "Plan de pensiones Indexa 60/40", amount: 18900.35, assetClass: "mixto", monthly: 200 },
    ],
  },
  {
    name: "Seguros y otros",
    holdings: [
      { name: "Seguro de vida-ahorro Mapfre", amount: 9400, assetClass: "seguro", monthly: 100 },
      { name: "Efectivo", amount: 800, assetClass: "efectivo" },
      { name: "Dacia Duster 2021", amount: 11500, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
