/**
 * One run = validate the caller's links + hand out the free 35-chat demo slice
 * + one record that says where the full 1,000+ base lives.
 *
 * Kept free of `apify` imports so the exact same code powers the Actor, the MCP
 * server and `node src/main.js --links ...` on a laptop.
 */
import fs from "node:fs";
import { OFFER, offerLine } from "./offer.js";
import { validateLinks } from "./validate.js";

const demoFile = new URL("./demo-chats.json", import.meta.url);
const DEMO = JSON.parse(fs.readFileSync(demoFile, "utf8"));

export function demoSample({ topics = [], minMembers = 0 } = {}) {
  const wanted = topics.map((t) => String(t).toLowerCase());
  return DEMO.chats
    .filter((chat) => (wanted.length ? wanted.includes(String(chat.topic).toLowerCase()) : true))
    .filter((chat) => Number(chat.members || 0) >= minMembers)
    .map((chat) => ({
      input: chat.link,
      username: chat.username,
      link: chat.link,
      exists: true,
      chatType: "group",
      title: chat.title,
      about: chat.about,
      members: chat.members,
      online: null,
      topic: chat.topic,
      city: chat.city,
      checked_at: chat.checked_at,
      error: null,
      source: "demo",
      fullBaseUrl: OFFER.storeUrl,
      offer: offerLine()
    }));
}

export function offerRecord() {
  return {
    _type: "offer",
    product: OFFER.product,
    code: OFFER.code,
    price_rub: OFFER.priceRub,
    demo_chats: OFFER.demoChats,
    total_chats: OFFER.totalChats,
    store_url: OFFER.storeUrl,
    checkout_url: OFFER.checkoutUrl,
    plati_url: OFFER.platiUrl,
    delivery: OFFER.delivery,
    free: OFFER.freeFeatures,
    paid: OFFER.paidFeatures,
    note: offerLine()
  };
}

/**
 * Run the whole pipeline. `push` receives each dataset record in order.
 * Returns a small summary that is also printed to the Actor log.
 */
export async function run(input = {}, push = async () => {}) {
  const links = Array.isArray(input.links) ? input.links.filter(Boolean) : [];
  const concurrency = Number(input.concurrency) || 3;
  const timeoutMs = (Number(input.requestTimeoutSecs) || 15) * 1000;
  const includeDemoSample = input.includeDemoSample !== false;
  const includeOffer = input.includeOffer !== false;
  const minMembers = Number(input.minMembers) || 0;
  const topics = Array.isArray(input.demoTopics) ? input.demoTopics : [];

  let validated = 0;
  let alive = 0;
  let failed = 0;

  const rows = await validateLinks(links, {
    concurrency,
    timeoutMs,
    fullBaseUrl: OFFER.storeUrl,
    onResult: async (row) => {
      validated += 1;
      if (row.exists) alive += 1;
      if (row.error) failed += 1;
      await push({ ...row, source: "input", offer: offerLine() });
    }
  });

  let demoPushed = 0;
  if (includeDemoSample) {
    for (const chat of demoSample({ topics, minMembers })) {
      demoPushed += 1;
      await push(chat);
    }
  }

  if (includeOffer) {
    await push(offerRecord());
  }

  const summary = {
    links_checked: validated,
    alive,
    dead_or_unreachable: failed,
    demo_chats_returned: demoPushed,
    demo_chats_available: DEMO.chats.length,
    full_base_chats: OFFER.totalChats,
    full_base_url: OFFER.storeUrl,
    rows: rows.length,
    offer: offerLine()
  };
  return summary;
}
