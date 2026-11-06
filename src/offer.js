/**
 * Single source of truth for the paid offer.
 *
 * Every dataset record, README section and MCP tool answer points here, so the
 * price and the checkout URL can never drift apart between the Actor, the MCP
 * server and the storefront.
 */
export const OFFER = {
  product: "TG Chat Validator Pro — 1,000+ open Telegram chats + validator + Excel export",
  code: "TW1-TG",
  priceRub: 490,
  demoChats: 35,
  totalChats: 1017,
  storeUrl: "https://9xj89gzrtw-hue.github.io/tg-chats/",
  checkoutUrl: "https://oplata.info/asp2/pay_wm.asp?id_d=6354600&ai=1481449&lang=ru-RU",
  platiUrl: "https://plati.market/itm/6354600",
  platiLotId: 6354600,
  seller: "danilaonly (Plati.Market ID 1481449)",
  delivery: "Instant TW1-TG-… key on the order page right after SBP / RU card payment.",
  freeFeatures: [
    "35-chat demo slice with topics, member counts and links",
    "link validator: alive, type, members, online",
    "CSV export of whatever you validated in this run"
  ],
  paidFeatures: [
    "1,017 verified public chats (WB/Ozon, wholesale, cargo, real estate, IT, crypto, education, auto, local)",
    "XLSX/CSV with topic, city, members, last-checked date",
    "offline validator page: paste 500 links, get a clean table",
    "lifetime key, no subscription"
  ]
};

/** The purchase line that appears in every dataset record and MCP answer. */
export function offerLine() {
  return (
    `Free demo: ${OFFER.demoChats} of ${OFFER.totalChats} chats. ` +
    `Full base + Excel export (${OFFER.code}, ${OFFER.priceRub} RUB): ${OFFER.storeUrl} ` +
    `| Plati.Market: ${OFFER.platiUrl}`
  );
}
