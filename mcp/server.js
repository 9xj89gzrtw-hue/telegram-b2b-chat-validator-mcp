#!/usr/bin/env node
/**
 * MCP server (stdio) — Telegram B2B chat validator.
 *
 * Three tools, zero API keys, zero Telegram login:
 *
 *   validate_telegram_links  — t.me link -> alive/dead, type, members, online
 *   get_demo_chat_sample     — 35 real RU B2B chats (WB/Ozon, wholesale, cargo, IT)
 *   get_full_base_offer      — where the full 1,000+ chat base is sold, price, delivery
 *
 * Wire it into Claude Desktop / Cursor / any MCP client:
 *
 *   {
 *     "mcpServers": {
 *       "telegram-b2b-chats": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/telegram-b2b-chat-validator-mcp/mcp/server.js"]
 *       }
 *     }
 *   }
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { OFFER, offerLine } from "../src/offer.js";
import { demoSample, offerRecord } from "../src/run.js";
import { validateLinks } from "../src/validate.js";

const NAME = "telegram-b2b-chat-validator";
const VERSION = "1.0.0";

const tools = [
  {
    name: "validate_telegram_links",
    description:
      "Check a list of Telegram links against public t.me previews, without login or API keys. " +
      "Returns for each link: alive/dead, group vs channel, title, description, members and online count. " +
      "Accepts https://t.me/name, t.me/s/name, @name or bare username.",
    inputSchema: {
      type: "object",
      properties: {
        links: {
          type: "array",
          items: { type: "string" },
          description: "Telegram links or @usernames, up to ~200 per call."
        },
        minMembers: {
          type: "integer",
          minimum: 0,
          description: "Optional filter: drop chats smaller than this many members."
        },
        concurrency: {
          type: "integer",
          minimum: 1,
          maximum: 8,
          default: 3,
          description: "Parallel t.me requests. Keep <= 3 to stay polite."
        }
      },
      required: ["links"]
    }
  },
  {
    name: "get_demo_chat_sample",
    description:
      `Free demo slice of ${OFFER.demoChats} real Russian-speaking B2B Telegram chats ` +
      "(Wildberries/Ozon sellers, wholesale, cargo/logistics, IT/freelance, crypto, education, auto, local). " +
      "Each row has topic, city, member count and a live t.me link. The full base has " +
      `${OFFER.totalChats} chats with Excel export — see get_full_base_offer.`,
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Filter by category, e.g. \"Маркетплейсы WB/Ozon\", \"Закупки/Опт\", \"Логистика/Карго\", " +
            "\"IT/Фриланс\", \"Крипто/Web3\", \"Недвижимость/Ремонт\", \"Образование/Школы\", " +
            "\"Авто/Спецтехника\", \"Локальные услуги/Города\"."
        },
        minMembers: { type: "integer", minimum: 0, default: 0 },
        limit: { type: "integer", minimum: 1, maximum: 35, default: 35 }
      }
    }
  },
  {
    name: "get_full_base_offer",
    description:
      "Returns the paid offer: what is inside the full 1,000+ chat base (TW1-TG), " +
      "the RUB price, the instant-delivery terms and the direct checkout + Plati.Market links.",
    inputSchema: { type: "object", properties: {} }
  }
];

const server = new Server(
  { name: NAME, version: VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

function textResult(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "validate_telegram_links") {
    const links = Array.isArray(args.links) ? args.links : [];
    if (!links.length) {
      return textResult({ error: "pass at least one link in `links`" });
    }
    const rows = await validateLinks(links.slice(0, 200), {
      concurrency: Number(args.concurrency) || 3,
      fullBaseUrl: OFFER.storeUrl
    });
    const minMembers = Number(args.minMembers) || 0;
    const filtered = minMembers ? rows.filter((r) => (r.members || 0) >= minMembers) : rows;
    return textResult({
      checked: rows.length,
      alive: rows.filter((r) => r.exists).length,
      results: filtered.map((r) => ({ ...r, offer: offerLine() }))
    });
  }

  if (name === "get_demo_chat_sample") {
    const limit = Math.min(Number(args.limit) || OFFER.demoChats, OFFER.demoChats);
    const rows = demoSample({
      topics: args.topic ? [args.topic] : [],
      minMembers: Number(args.minMembers) || 0
    }).slice(0, limit);
    return textResult({
      count: rows.length,
      demo_of_total: OFFER.totalChats,
      note: offerLine(),
      chats: rows
    });
  }

  if (name === "get_full_base_offer") {
    return textResult(offerRecord());
  }

  return textResult({ error: `unknown tool: ${name}` });
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[${NAME}] MCP server ready on stdio (v${VERSION})`);
