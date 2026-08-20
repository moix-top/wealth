// Claudia Bengoa, camino del FIRE. Personaje ficticio; instrumentos reales.
// Pocas partidas a propósito: la gracia de esta cartera es lo que NO tiene.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Interactive Brokers",
    holdings: [
      {
        name: "Vanguard FTSE All-World UCITS ETF Acc · IE00BK5BQT80 (TER 0,14 %)",
        amount: 742000.4,
        assetClass: "rv",
        monthly: 3500,
      },
      {
        name: "iShares Core MSCI EM IMI UCITS ETF Acc · IE00BKM4GZ66",
        amount: 96500.2,
        assetClass: "rv",
        monthly: 500,
      },
      {
        name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged · IE00BDBRDM35",
        amount: 128400,
        assetClass: "rf",
        monthly: 600,
      },
    ],
  },
  {
    name: "MyInvestor",
    holdings: [
      { name: "Cartera Ahorro (fondos monetarios y Letras)", amount: 48000, assetClass: "monetario" },
      { name: "Plan de pensiones indexado global", amount: 87300.6, assetClass: "rv", monthly: 125 },
    ],
  },
  {
    name: "Colchón y otros",
    holdings: [
      { name: "Cuenta remunerada Trade Republic (2,00 % TAE)", amount: 32000, assetClass: "liquidez" },
      { name: "Cuenta corriente BBVA", amount: 4200.15, assetClass: "liquidez_sin" },
      { name: "Invesco Physical Gold ETC · IE00B579F325", amount: 38200, assetClass: "otro" },
      { name: "Bitcoin (autocustodia)", amount: 62400, assetClass: "cripto" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
