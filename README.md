# Telegram B2B Chat Validator — MCP Server + Apify Actor

> **Want the full 1,201-chat base and Excel export?**
> **TG Chat Validator Pro** (`TW1-TG`, 490 ₽) adds the complete verified catalog, the offline validator and a clean XLSX/CSV: **https://9xj89gzrtw-hue.github.io/tg-chats/** · [Plati.Market lot 6354600](https://plati.market/itm/6354600).

**Validate `t.me` links without login, API keys or a Telegram client.** One HTTP request per link to the public `t.me` preview page gives you: alive or dead, group vs channel, member count, and who is online right now. Ships with a **free demo slice of 35 real Russian-speaking B2B chats** for Wildberries/Ozon sellers, wholesale buyers, cargo brokers and IT freelancers.

[![MCP](https://img.shields.io/badge/MCP-server-6f42c1)](https://modelcontextprotocol.io)
[![Apify](https://img.shields.io/badge/Apify-Actor-00b2a9)](https://apify.com)
[![tests](https://img.shields.io/badge/tests-9%20passing-brightgreen)](#tests)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

- 🔍 `validate_telegram_links` — batch-check 200 links, get a clean table
- 🧪 `get_demo_chat_sample` — 35 curated RU B2B chats with topics and member counts
- 💾 `get_full_base_offer` — the paid 1,201-chat base with XLSX/CSV export (`TW1-TG`)

No Telegram account, no `api_id`/`api_hash`, no browser automation. If a username exists, `t.me/<name>` renders a public preview; if it was deleted, the same page returns `Telegram: Contact @name` and no counters.

---

## Why this exists

Scraping Telegram groups usually means a burner account, a `Telethon` session and a ban risk. But for **public** chats and channels you do not need any of that: the public preview page already exposes everything a seller needs to decide whether a chat is worth joining — size, type, and whether it is still alive.

That is exactly the job: take a list of links from a spreadsheet, a competitor's post or a marketplace chat list, and turn it into a table with real numbers.

```bash
node src/main.js --links https://t.me/ozon_chat,https://t.me/python,https://t.me/deleted_chat_xyz
```

```json
{
  "input": "https://t.me/ozon_chat",
  "username": "ozon_chat",
  "exists": true,
  "chatType": "group",
  "title": "OZON | Чат селлеров",
  "members": 54428,
  "online": 5906,
  "checked_at": "2026-11-06T12:00:00.000Z",
  "error": null,
  "fullBaseUrl": "https://9xj89gzrtw-hue.github.io/tg-chats/"
}
```

---

## Install as an MCP server

### Claude Desktop / Cursor / any stdio MCP client

```json
{
  "mcpServers": {
    "telegram-b2b-chats": {
      "command": "npx",
      "args": ["-y", "github:9xj89gzrtw-hue/telegram-b2b-chat-validator-mcp"]
    }
  }
}
```

Or from a clone:

```bash
git clone https://github.com/9xj89gzrtw-hue/telegram-b2b-chat-validator-mcp.git
cd telegram-b2b-chat-validator-mcp
npm install
node mcp/server.js   # speaks MCP over stdio
```

### Tools

| Tool | Arguments | Returns |
|---|---|---|
| `validate_telegram_links` | `links[]`, `minMembers?`, `concurrency?` | per-link `exists`, `chatType`, `members`, `online`, `title`, `about`, `error` |
| `get_demo_chat_sample` | `topic?`, `minMembers?`, `limit?` | up to 35 demo chats: `topic`, `city`, `members`, `link` |
| `get_full_base_offer` | — | price, delivery terms, store + Plati.Market links |

Example prompt:

> Validate these 12 t.me links, drop anything under 5 000 members, and tell me which three are the biggest WB/Ozon seller chats.

---

## Run as an Apify Actor

Input (`INPUT_SCHEMA.json`):

```json
{
  "links": ["https://t.me/ozon_chat", "https://t.me/python"],
  "includeDemoSample": true,
  "demoTopics": ["Маркетплейсы WB/Ozon", "Закупки/Опт"],
  "minMembers": 5000,
  "includeOffer": true,
  "concurrency": 3
}
```

Output: one dataset record per validated link, one per demo chat, plus a single `_type: "offer"` summary record. Every record carries `fullBaseUrl`, so a downstream LLM or spreadsheet can always find the paid base without a second lookup.

Actor folder layout follows the Apify spec:

```
.actor/actor.json        # metadata, input, dataset schema
.actor/INPUT_SCHEMA.json
Dockerfile               # apify/actor-node:20
src/main.js              # Actor entry point
```

Deploy:

```bash
npm install -g apify-cli
apify login
apify push
```

---

## Free vs paid

| | Free (this repo) | Full base (`TW1-TG`) |
|---|---|---|
| Chat list | 35 demo chats | **1 017 verified public chats** |
| Topics | 9 categories | 9 categories, with city |
| Validator | unlimited links | unlimited links, offline page |
| Export | CSV of the current run | **XLSX + CSV**, refreshed dates |
| Price | 0 ₽ | **490 ₽**, one-time, no subscription |

The full base with the Excel export and the offline validator lives here:

- Storefront (free demo + instant checkout): **https://9xj89gzrtw-hue.github.io/tg-chats/**
- Plati.Market card: **https://plati.market/itm/6354600**

After SBP / RU card payment the `TW1-TG-…` key is issued automatically on the order page — no waiting for a seller to come online. The key is signed with ECDSA P-256 and verified in the browser, so activation works offline.

---

## Related free tools (no signup)

- **Table / Telegram → clean CSV/XLSX in one click** — https://9xj89gzrtw-hue.github.io/data-clipper/
- **WB/Ozon 2026 margin calculator** (inside the same studio) — https://9xj89gzrtw-hue.github.io/data-clipper/
- **Userscripts for YouTube/VK audio and table export** — https://9xj89gzrtw-hue.github.io/userscripts/
- **Base wallet revoke scanner + Excel export** — https://9xj89gzrtw-hue.github.io/base-tax-audit/

---

## How the parsing works

1. `normalizeTarget()` accepts `https://t.me/name`, `t.me/s/name`, `@name`, bare `name`, and recognises private invites (`t.me/+hash`) that cannot be checked without joining.
2. `GET https://t.me/<name>` with a plain user agent and `Accept-Language: ru-RU`.
3. `parseTelegramPage()` reads `og:title`, `og:description` and `div.tgme_page_extra` (`54 428 members, 5 906 online` / `9 177 803 subscribers`).
4. A page whose title is exactly `Telegram: Contact @name` is treated as **missing** — that is what Telegram returns for deleted or never-existing usernames.

Rate limits: keep `concurrency` at 3 or lower. `mapLimit()` preserves input order, and a failed request becomes `{ "error": "..." }` instead of aborting the batch.

## Tests

```bash
npm test
```

Nine tests cover link normalisation, invite handling, number parsing (`54 428` / nbsp / thin space), group vs channel vs missing pages, and the demo/offer contracts. HTML fixtures are inline, so tests run offline.

## Keywords

`mcp-server` · `model-context-protocol` · `claude-mcp` · `apify-actor` · `telegram-scraper` · `telegram-chats` · `t.me` · `wildberries` · `ozon` · `b2b-leads` · `marketplace-sellers` · `no-api-key`

## License

MIT — see [LICENSE](./LICENSE).
