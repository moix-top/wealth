// Rubén Cortés, peón de obra. Personaje ficticio; entidades e instrumentos reales.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "CaixaBank",
    holdings: [
      { name: "Cuenta nómina", amount: 1840.2, assetClass: "liquidez_sin", monthly: 40 },
      { name: "Cuenta de ahorro (0,50 % TAE)", amount: 3200, assetClass: "liquidez", monthly: 120 },
    ],
  },
  {
    name: "MyInvestor",
    holdings: [
      {
        name: "Vanguard Global Stock Index Fund EUR Acc · IE00B03HD191",
        amount: 1650.4,
        assetClass: "rv",
        monthly: 100,
      },
    ],
  },
  {
    name: "Fuera del banco",
    holdings: [
      { name: "Efectivo en casa", amount: 600, assetClass: "efectivo" },
      { name: "Furgoneta Citroën Berlingo 2016", amount: 2200, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 10);
