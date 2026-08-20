// Elena Krauss, fundadora tecnológica tras vender su compañía. Personaje
// ficticio; instrumentos, gestoras y entidades reales.
//
// Lo que enseña este perfil es el problema real de quien vende: una
// concentración enorme en un solo activo y una diversificación que aún va por
// detrás. Por eso "Participación en la compañía" pesa más que todo lo demás.
import { buildPortfolio, type DemoGroupSpec } from "./build";

const SPEC: DemoGroupSpec[] = [
  {
    name: "Participación en la compañía",
    holdings: [
      // Beta alta: un solo valor cotizado se mueve mucho más que el índice.
      { name: "Acciones ordinarias tras la salida a bolsa (bloqueadas)", amount: 1180000000, assetClass: "rv", beta: 1.9 },
      { name: "Acciones vendidas en la oferta secundaria", amount: 240000000, assetClass: "rv", beta: 1.9 },
    ],
  },
  {
    name: "Cartera diversificada · banca privada internacional",
    holdings: [
      { name: "Mandato global de renta variable (índices MSCI World y ACWI)", amount: 268000000, assetClass: "rv" },
      { name: "Vanguard FTSE All-World UCITS ETF Acc · IE00BK5BQT80", amount: 96000000, assetClass: "rv" },
      { name: "Renta fija soberana europea y estadounidense", amount: 184000000, assetClass: "rf" },
      { name: "Crédito corporativo grado inversión", amount: 72000000, assetClass: "rf" },
      { name: "Cartera mixta discrecional", amount: 54000000, assetClass: "mixto" },
    ],
  },
  {
    name: "Venture y capital riesgo",
    holdings: [
      { name: "Fondo propio de venture (early stage europeo)", amount: 120000000, assetClass: "otro" },
      { name: "Compromisos en fondos de terceros (LP)", amount: 86000000, assetClass: "otro" },
      { name: "Inversiones ángel directas (32 compañías)", amount: 41000000, assetClass: "otro" },
      { name: "Deuda privada y direct lending", amount: 28000000, assetClass: "otro" },
    ],
  },
  {
    name: "Inmobiliario",
    holdings: [
      { name: "Residencia principal (Zúrich)", amount: 24000000, assetClass: "inmueble" },
      { name: "Cartera residencial en alquiler (Berlín y Lisboa)", amount: 38000000, assetClass: "inmueble" },
      { name: "Suelo y naves logísticas", amount: 19000000, assetClass: "inmueble" },
    ],
  },
  {
    name: "Liquidez y reservas",
    holdings: [
      { name: "Fondos monetarios en euros y dólares", amount: 62000000, assetClass: "monetario" },
      { name: "Depósitos remunerados en varias entidades", amount: 34000000, assetClass: "liquidez" },
      { name: "Cuentas operativas", amount: 2400000, assetClass: "liquidez_sin" },
      { name: "Efectivo", amount: 120000, assetClass: "efectivo" },
    ],
  },
  {
    name: "Otros activos y compromisos",
    holdings: [
      { name: "Invesco Physical Gold ETC · IE00B579F325", amount: 21000000, assetClass: "otro" },
      { name: "Bitcoin (custodia institucional)", amount: 46000000, assetClass: "cripto" },
      { name: "Dotación comprometida a su fundación", amount: 92000000, assetClass: "otro" },
      { name: "Seguro de vida unit linked", amount: 12000000, assetClass: "seguro" },
      { name: "Colección de arte y automóviles", amount: 8600000, assetClass: "bien" },
    ],
  },
];

export default buildPortfolio(SPEC, 12);
