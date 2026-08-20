// Nerea Aguilar, técnica sanitaria. Personaje ficticio; instrumentos reales.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "BBVA",
    holdings: [
      { name: "Cuenta nómina", amount: 2410.65, assetClass: "liquidez_sin", monthly: 50 },
    ],
  },
  {
    name: "Trade Republic",
    holdings: [
      { name: "Efectivo remunerado (2,00 % TAE)", amount: 9800, assetClass: "liquidez", monthly: 200 },
      {
        name: "iShares Core MSCI World UCITS ETF Acc · IE00B4L5Y983",
        amount: 14200.8,
        assetClass: "rv",
        monthly: 300,
      },
    ],
  },
  {
    name: "MyInvestor",
    holdings: [
      { name: "Cartera Ahorro (La Française Trésorerie ISR)", amount: 6500, assetClass: "monetario", monthly: 150 },
      { name: "Plan de pensiones indexado global", amount: 4300.5, assetClass: "rv", monthly: 100 },
    ],
  },
  {
    name: "Otros",
    holdings: [
      { name: "Efectivo", amount: 350, assetClass: "efectivo" },
      { name: "Seat Ibiza 2019", amount: 8200, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
