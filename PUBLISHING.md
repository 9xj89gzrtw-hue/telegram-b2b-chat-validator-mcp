# Publishing checklist

The repo is already public, tagged `v1.0.0` and crawlable. These are the
remaining one-command steps that need an account token.

## 1. Apify Store (2 minutes)

```bash
export APIFY_TOKEN=...              # https://console.apify.com/account/integrations
cd telegram-open-chats-wb-ozon-validator   # or the repo root
npx apify-cli push                  # builds from .actor/actor.json + Dockerfile
```

Actor id: `telegram-open-chats-wb-ozon-validator`. The Store listing uses
`title`/`description` from `.actor/actor.json`; the input UI is
`.actor/INPUT_SCHEMA.json`. Publishing is free, Apify takes a cut only on paid
runs — this Actor defaults to free with the offer record pointing to the paid
chat base.

## 2. npm (unlocks `npx` and the official MCP registry)

The name `telegram-b2b-chat-validator-mcp` is free on npm.

```bash
npm login
npm publish --access public
```

After that the client config becomes shorter:

```json
{ "mcpServers": { "telegram-b2b-chats": {
  "command": "npx", "args": ["-y", "telegram-b2b-chat-validator-mcp"] } } }
```

## 3. Official MCP registry

Create `server.json` in the repo root:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
  "name": "io.github.9xj89gzrtw-hue/telegram-b2b-chat-validator-mcp",
  "description": "Validate Telegram t.me links without login: alive, members, online, group vs channel.",
  "version": "1.0.0",
  "repository": { "url": "https://github.com/9xj89gzrtw-hue/telegram-b2b-chat-validator-mcp", "source": "github" },
  "packages": [
    { "registryType": "npm", "identifier": "telegram-b2b-chat-validator-mcp",
      "version": "1.0.0", "transport": { "type": "stdio" } }
  ]
}
```

Then publish with [`mcp-publisher`](https://github.com/modelcontextprotocol/registry)
(`mcp-publisher publish`) — it authenticates through GitHub. Requires step 2.

## 4. Aggregators

All three index GitHub repos automatically; a manual poke speeds it up:

| Registry | How |
|---|---|
| glama.ai | crawls the `mcp-server` topic; claim the listing via GitHub login |
| mcp.so | submit form at https://mcp.so/submit (needs login) |
| pulsemcp.com | submit at https://www.pulsemcp.com/submit or open an issue |
| awesome-mcp-servers | PR adding the repo under *Search & Data Extraction* |

## 5. Cross-posting

The launch article is on DEV.to:
https://dev.to/9xj89gzrtwhue/how-to-extract-clean-csvxlsx-from-any-web-table-or-telegram-channel-locally-in-browser-zero-194j

Canonical is set to the tool page, so reposting to Hashnode/Medium is safe.
