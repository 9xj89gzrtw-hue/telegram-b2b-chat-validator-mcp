import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTarget, parseCount, parseTelegramPage } from "../src/validate.js";
import { demoSample, offerRecord } from "../src/run.js";
import { OFFER } from "../src/offer.js";

const GROUP_HTML = `
<html><head>
<meta property="og:title" content="OZON | Чат селлеров"/>
<meta property="og:description" content="Чат взаимопомощи поставщиков"/>
</head><body>
<div class="tgme_page_extra">54 428 members, 5 906 online</div>
</body></html>`;

const CHANNEL_HTML = `
<html><head>
<meta property="og:title" content="Telegram News"/>
<meta property="og:description" content="Official news"/>
</head><body>
<div class="tgme_page_extra">9 177 803 subscribers</div>
</body></html>`;

const MISSING_HTML = `
<html><head>
<meta property="og:title" content="Telegram: Contact @this_chat_does_not_exist_zzz9"/>
</head><body><div class="tgme_page_description"></div></body></html>`;

test("normalizeTarget accepts every shape of a t.me link", () => {
  const expected = "ozon_chat";
  for (const raw of [
    "https://t.me/ozon_chat",
    "http://t.me/ozon_chat",
    "t.me/ozon_chat",
    "https://t.me/s/ozon_chat",
    "@ozon_chat",
    "ozon_chat",
    "https://t.me/ozon_chat?utm_source=x"
  ]) {
    const t = normalizeTarget(raw);
    assert.equal(t.kind, "username", raw);
    assert.equal(t.username, expected, raw);
    assert.equal(t.link, "https://t.me/ozon_chat", raw);
  }
});

test("normalizeTarget flags invite links and junk", () => {
  assert.equal(normalizeTarget("https://t.me/+AbCdEf123").kind, "invite");
  assert.equal(normalizeTarget("https://t.me/joinchat/AbCdEf123").kind, "invite");
  assert.equal(normalizeTarget("not a link").kind, "invalid");
  assert.equal(normalizeTarget("").kind, "invalid");
});

test("parseCount handles spaces, nbsp and thin spaces", () => {
  assert.equal(parseCount("54 428"), 54428);
  assert.equal(parseCount("54\u00a0428"), 54428);
  assert.equal(parseCount("54\u202f428"), 54428);
  assert.equal(parseCount(""), null);
});

test("parseTelegramPage reads a public group", () => {
  const p = parseTelegramPage(GROUP_HTML, "ozon_chat");
  assert.equal(p.exists, true);
  assert.equal(p.chatType, "group");
  assert.equal(p.members, 54428);
  assert.equal(p.online, 5906);
  assert.equal(p.title, "OZON | Чат селлеров");
});

test("parseTelegramPage reads a channel", () => {
  const p = parseTelegramPage(CHANNEL_HTML, "telegram");
  assert.equal(p.exists, true);
  assert.equal(p.chatType, "channel");
  assert.equal(p.members, 9177803);
  assert.equal(p.online, null);
});

test("parseTelegramPage marks a deleted username as missing", () => {
  const p = parseTelegramPage(MISSING_HTML, "this_chat_does_not_exist_zzz9");
  assert.equal(p.exists, false);
  assert.equal(p.chatType, "missing");
  assert.equal(p.members, null);
});

test("the demo slice is exactly 35 chats with live links", () => {
  const rows = demoSample();
  assert.equal(rows.length, 35);
  assert.equal(OFFER.demoChats, 35);
  for (const row of rows) {
    assert.match(row.link, /^https:\/\/t\.me\/[A-Za-z0-9_]+$/);
    assert.ok(row.members > 0);
    assert.equal(row.source, "demo");
    assert.match(row.fullBaseUrl, /^https:\/\//);
  }
});

test("demo filters by topic and size", () => {
  const rows = demoSample({ topics: ["Маркетплейсы WB/Ozon"], minMembers: 30000 });
  assert.ok(rows.length >= 2);
  for (const row of rows) {
    assert.equal(row.topic, "Маркетплейсы WB/Ozon");
    assert.ok(row.members >= 30000);
  }
});

test("offer record carries both checkout links and the price", () => {
  const offer = offerRecord();
  assert.equal(offer.code, "TW1-TG");
  assert.equal(offer.price_rub, 490);
  assert.match(offer.store_url, /9xj89gzrtw-hue\.github\.io\/tg-chats/);
  assert.match(offer.plati_url, /plati\.market/);
  assert.match(offer.checkout_url, /oplata\.info/);
});
