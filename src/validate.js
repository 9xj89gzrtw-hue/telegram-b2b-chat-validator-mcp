/**
 * t.me link validator — no login, no API key, no Telegram client.
 *
 * Telegram renders a public preview page for every public @username at
 * https://t.me/<name>. That page is enough to answer the three questions a
 * marketplace seller actually has:
 *
 *   1. is the chat still alive?   -> does the preview exist at all
 *   2. how big is it?             -> "54 428 members" / "9 177 803 subscribers"
 *   3. is it a chat or a channel? -> "members ... online" vs "subscribers"
 *
 * Invite links (t.me/+hash, t.me/joinchat/...) are private by design: there is
 * no public preview, so they are reported as private-invite instead of being
 * counted as dead.
 */

/** Strip HTML entities that Telegram puts into og: meta tags. */
const ENTITIES = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", "#39": "'" };

export function unescapeHtml(value) {
  return String(value || "").replace(/&(#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === "#") return String.fromCharCode(Number(code.slice(1)));
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** "54 428" / "54 428" (nbsp / thin space) -> 54428 */
export function parseCount(text) {
  if (!text) return null;
  const digits = String(text).replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/**
 * Accept https://t.me/name, http://t.me/s/name, t.me/name, @name, name.
 * Returns { kind, username, link } where kind is username | invite | invalid.
 */
export function normalizeTarget(raw) {
  const input = String(raw || "").trim();
  if (!input) return { kind: "invalid", username: null, link: null, raw: input };

  const invite = input.match(/(?:t\.me|telegram\.me)\/(?:\+|joinchat\/)([\w-]+)/i);
  if (invite) {
    return { kind: "invite", username: null, link: `https://t.me/+${invite[1]}`, raw: input };
  }

  let username = input
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\//i, "")
    .replace(/^s\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();

  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)) {
    return { kind: "invalid", username: username || null, link: null, raw: input };
  }
  return { kind: "username", username, link: `https://t.me/${username}`, raw: input };
}

/**
 * Parse a t.me public preview page.
 * Exported separately so it can be unit-tested against saved HTML.
 */
export function parseTelegramPage(html, username) {
  const pick = (re) => {
    const m = html.match(re);
    return m ? unescapeHtml(m[1]).trim() : null;
  };

  const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  const about = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
    || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  const extraHtml = (html.match(/<div class=["']tgme_page_extra["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
  const extra = unescapeHtml(extraHtml.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

  // Telegram returns this exact title for usernames that do not exist (or were
  // deleted). A real user/bot/channel always shows its display name instead.
  const missing = !title || new RegExp(`^Telegram:\\s*Contact\\s*@${username}$`, "i").test(title);

  const membersMatch = extra.match(/([\d\s\u00a0\u202f]+)\s*(?:members|подписчик|участник)/i)
    || extra.match(/([\d\s\u00a0\u202f]+)\s*subscribers?/i);
  const onlineMatch = extra.match(/([\d\s\u00a0\u202f]+)\s*online/i);

  const members = parseCount(membersMatch && membersMatch[1]);
  const online = parseCount(onlineMatch && onlineMatch[1]);

  let chatType;
  if (missing) chatType = "missing";
  else if (/members?/i.test(extra) || /участник/i.test(extra)) chatType = "group";
  else if (/subscribers?|подписчик/i.test(extra)) chatType = "channel";
  else chatType = "user-or-bot";

  return {
    title: missing ? null : title,
    about: missing ? null : about,
    members,
    online,
    chatType,
    exists: !missing,
    rawExtra: extra || null
  };
}

/** Fetch one t.me preview with a hard timeout. */
async function fetchPreview(url, timeoutMs, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A plain UA keeps Telegram on the light public-preview markup.
        "user-agent": "Mozilla/5.0 (compatible; tg-chat-validator/1.0; +https://github.com/9xj89gzrtw-hue/telegram-b2b-chat-validator-mcp)",
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.8"
      }
    });
    const html = await res.text();
    return { status: res.status, html };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate one raw link. Never throws: a network error becomes
 * { exists: false, error } so a 500-link batch still produces a full table.
 */
export async function validateLink(raw, options = {}) {
  const { timeoutMs = 15000, fetchImpl } = options;
  const target = normalizeTarget(raw);
  const checkedAt = new Date().toISOString();

  const base = {
    input: String(raw || ""),
    username: target.username,
    link: target.link,
    exists: false,
    chatType: target.kind === "invite" ? "private-invite" : "missing",
    title: null,
    about: null,
    members: null,
    online: null,
    topic: null,
    checked_at: checkedAt,
    error: null,
    fullBaseUrl: options.fullBaseUrl || null
  };

  if (target.kind === "invalid") {
    return { ...base, error: "not a t.me username, invite link or @handle" };
  }
  if (target.kind === "invite") {
    return { ...base, error: null };
  }

  try {
    const { status, html } = await fetchPreview(target.link, timeoutMs, fetchImpl);
    if (status === 404) {
      return { ...base, error: "HTTP 404" };
    }
    if (status !== 200) {
      return { ...base, error: `HTTP ${status}` };
    }
    return { ...base, ...parseTelegramPage(html, target.username) };
  } catch (err) {
    const message = err && err.name === "AbortError"
      ? `timeout after ${timeoutMs} ms`
      : (err && err.message) || String(err);
    return { ...base, error: message };
  }
}

/** Map with a fixed concurrency ceiling; keeps the output order stable. */
export async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return out;
}

/** Validate a whole batch with polite pacing between rounds. */
export async function validateLinks(links, options = {}) {
  const { concurrency = 3, timeoutMs = 15000, fetchImpl, onResult } = options;
  return mapLimit(links, concurrency, async (raw) => {
    const row = await validateLink(raw, { timeoutMs, fetchImpl, fullBaseUrl: options.fullBaseUrl });
    if (typeof onResult === "function") onResult(row);
    return row;
  });
}
