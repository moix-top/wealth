// Dr. Alfonso Vilar, jubilado que vive de rentas. Personaje ficticio;
// instrumentos reales. Cartera en modo conservación: renta fija y dividendos.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Bankinter Banca Privada",
    holdings: [
      { name: "Cuenta remunerada", amount: 96000, assetClass: "liquidez" },
      { name: "Letras del Tesoro a 12 meses", amount: 340000, assetClass: "rf" },
      { name: "Bonos del Estado 2031", amount: 285000, assetClass: "rf" },
      { name: "Renta fija corporativa grado inversión", amount: 210000, assetClass: "rf" },
    ],
  },
  {
    name: "Renta 4 · Cartera de dividendos",
    holdings: [
      { name: "Vanguard FTSE All-World High Dividend Yield · IE00B8GKDB10", amount: 420000, assetClass: "rv" },
      { name: "Iberdrola", amount: 168000, assetClass: "rv" },
      { name: "Enagás", amount: 92000, assetClass: "rv" },
      { name: "Repsol", amount: 78000, assetClass: "rv" },
    ],
  },
  {
    name: "Inmuebles y SOCIMIs",
    holdings: [
      { name: "Vivienda habitual (Pontevedra)", amount: 480000, assetClass: "inmueble" },
      { name: "Apartamento en alquiler (Vigo)", amount: 235000, assetClass: "inmueble" },
      { name: "Merlin Properties SOCIMI", amount: 145000, assetClass: "inmueble" },
      { name: "Inmobiliaria Colonial SOCIMI", amount: 98000, assetClass: "inmueble" },
    ],
  },
  {
    name: "Reserva y otros",
    holdings: [
      { name: "Groupama Trésorerie IC", amount: 180000, assetClass: "monetario" },
      { name: "Invesco Physical Gold ETC · IE00B579F325", amount: 152000, assetClass: "otro" },
      { name: "Unit linked Mapfre Vida", amount: 186000, assetClass: "seguro" },
      { name: "Cuenta corriente", amount: 18400.6, assetClass: "liquidez_sin" },
      { name: "Efectivo y caja fuerte", amount: 6000, assetClass: "efectivo" },
      { name: "Volvo XC60 2022", amount: 31000, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
