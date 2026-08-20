// Family office Serrano-Vidal. Familia ficticia; instrumentos y gestoras reales.
//
// El reparto por clases sigue el UBS Global Family Office Report 2025 (renta
// variable 30 %, capital riesgo 21 %, renta fija 18 %, inmuebles 11 %, liquidez
// 8 %, deuda privada 4 %, hedge funds 4 %, oro 2 %, infraestructura 1 %, arte
// 1 %). Usa las doce clases de activo de la app.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Renta variable cotizada",
    holdings: [
      {
        name: "iShares Core MSCI World UCITS ETF Acc · IE00B4L5Y983 (TER 0,20 %)",
        amount: 3850000,
        assetClass: "rv",
      },
      { name: "Vanguard FTSE All-World UCITS ETF Acc · IE00BK5BQT80", amount: 2100000, assetClass: "rv" },
      { name: "iShares Core MSCI EM IMI UCITS ETF Acc · IE00BKM4GZ66", amount: 940000, assetClass: "rv" },
      { name: "Cartera directa europea (mandato Renta 4)", amount: 920000, assetClass: "rv" },
    ],
  },
  {
    name: "Capital riesgo y alternativos",
    holdings: [
      { name: "Fondo de capital riesgo europeo (compromiso 2022)", amount: 3200000, assetClass: "otro" },
      { name: "Coinversiones directas en compañías no cotizadas", amount: 1450000, assetClass: "otro" },
      { name: "Secundarios de private equity", amount: 810000, assetClass: "otro" },
      { name: "Deuda privada (direct lending europeo)", amount: 1040000, assetClass: "otro" },
      { name: "Hedge funds multiestrategia (UCITS)", amount: 1040000, assetClass: "otro" },
      { name: "Infraestructura no cotizada", amount: 260000, assetClass: "otro" },
    ],
  },
  {
    name: "Renta fija",
    holdings: [
      { name: "Bonos del Estado español 2029-2034", amount: 1780000, assetClass: "rf" },
      {
        name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged · IE00BDBRDM35",
        amount: 1620000,
        assetClass: "rf",
      },
      { name: "Crédito corporativo grado inversión", amount: 1280000, assetClass: "rf" },
    ],
  },
  {
    name: "Inmobiliario",
    holdings: [
      { name: "Edificio de oficinas (Madrid, Chamberí)", amount: 1650000, assetClass: "inmueble" },
      { name: "Residencial en alquiler (Valencia, 4 unidades)", amount: 780000, assetClass: "inmueble" },
      { name: "Merlin Properties SOCIMI", amount: 420000, assetClass: "inmueble" },
    ],
  },
  {
    name: "Liquidez y tesorería",
    holdings: [
      { name: "Groupama Trésorerie IC (TER 0,15 %)", amount: 980000, assetClass: "monetario" },
      { name: "La Française Trésorerie ISR", amount: 640000, assetClass: "monetario" },
      { name: "Cuenta remunerada Bankinter Banca Privada", amount: 420000, assetClass: "liquidez" },
      { name: "Cuentas operativas del vehículo familiar", amount: 68000, assetClass: "liquidez_sin" },
      { name: "Caja del family office", amount: 12000, assetClass: "efectivo" },
    ],
  },
  {
    name: "Otros activos",
    holdings: [
      { name: "Invesco Physical Gold ETC · IE00B579F325 (TER 0,12 %)", amount: 520000, assetClass: "otro" },
      { name: "Bitcoin y Ethereum (custodia institucional)", amount: 390000, assetClass: "cripto" },
      { name: "Colección de arte contemporáneo", amount: 260000, assetClass: "otro" },
      { name: "Cartera mixta del plan de pensiones familiar", amount: 340000, assetClass: "mixto" },
      { name: "Seguro unit linked luxemburgués", amount: 480000, assetClass: "seguro" },
      { name: "Vehículos clásicos", amount: 180000, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
