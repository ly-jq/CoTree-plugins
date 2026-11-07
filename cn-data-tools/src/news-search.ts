// NewsSearch logic (blueprint 04 §B1). Moved verbatim from packages/browser-runtime
// so the capability lives in the cn-data-tools plugin. Transport is injectable.

import type { PluginJsonValue } from "@cotree/plugin-sdk";

type JsonObject = { [key: string]: PluginJsonValue };
import { fetchWithTimeoutRetry, type CnDataFetch, type FetchRetryAttempt } from "./http.js";

export type NewsSearchItem = {
  title: string;
  url: string;
  source: string;
  category?: string;
  publishedAt?: string;
  summary?: string;
};

export type NewsSearchOutput = {
  query: string;
  asOf: string;
  items: NewsSearchItem[];
  sources: string[];
  attempts: NewsSearchAttempt[];
  quality: {
    itemCount: number;
    sourceCount: number;
    categories: string[];
  };
};

export type NewsSearchAttempt = {
  source: string;
  url: string;
  ok: boolean;
  status?: number;
  itemCount?: number;
  error?: string;
  retryAttempts?: FetchRetryAttempt[];
};

export type NewsSearchOptions = {
  fetcher?: CnDataFetch;
  timeoutMs?: number;
  now?: Date;
  retry?: {
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onAttempt?: (attempt: FetchRetryAttempt) => void;
    sleep?: (ms: number) => Promise<void>;
  };
};

type NewsFeedSource = {
  name: string;
  category: string;
  url: string;
};

const defaultNewsSources: NewsFeedSource[] = [
  {
    name: "China News Service latest",
    category: "latest",
    url: "https://www.chinanews.com.cn/rss/scroll-news.xml"
  },
  {
    name: "People's Daily politics",
    category: "domestic",
    url: "https://www.people.com.cn/rss/politics.xml"
  },
  {
    name: "People's Daily society",
    category: "domestic",
    url: "https://www.people.com.cn/rss/society.xml"
  },
  {
    name: "People's Daily world",
    category: "international",
    url: "https://www.people.com.cn/rss/world.xml"
  },
  {
    name: "People's Daily finance",
    category: "finance",
    url: "https://www.people.com.cn/rss/finance.xml"
  }
];

export async function searchNews(
  input: {
    query?: string;
    categories?: string[];
    maxResults?: number;
    fresh?: boolean;
    abortSignal?: AbortSignal;
  },
  options: NewsSearchOptions = {}
): Promise<NewsSearchOutput> {
  const query = input.query?.trim() || "today news";
  const maxResults = Math.max(1, Math.min(input.maxResults ?? 10, 30));
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const asOf = now.toISOString();
  const wantedCategories = normalizeCategories(input.categories);
  const wantsNamedCategories = ["domestic", "international", "finance"].some((category) => wantedCategories.has(category));
  const sources = defaultNewsSources.filter(
    (source) => wantedCategories.size === 0 || wantedCategories.has(source.category) || wantedCategories.has("all") || (source.category === "latest" && wantsNamedCategories)
  );
  const attempts: NewsSearchAttempt[] = [];
  const items: NewsSearchItem[] = [];

  for (const source of sources) {
    const retryAttempts: FetchRetryAttempt[] = [];
    try {
      const response = await fetchWithTimeoutRetry(
        fetcher,
        source.url,
        input.abortSignal,
        options.timeoutMs ?? 8_000,
        "Mozilla/5.0 CoTree/0.1 NewsSearch",
        {},
        {
          attempts: options.retry?.attempts ?? 1,
          baseDelayMs: options.retry?.baseDelayMs ?? 250,
          maxDelayMs: options.retry?.maxDelayMs ?? 3_000,
          sleep: options.retry?.sleep,
          onAttempt: (attempt) => {
            retryAttempts.push(attempt);
            options.retry?.onAttempt?.(attempt);
          }
        }
      );
      const text = await response.text();
      if (!response.ok) {
        attempts.push({
          source: source.name,
          url: source.url,
          ok: false,
          status: response.status,
          error: `${response.status} ${response.statusText}`,
          ...(retryAttempts.length > 0 ? { retryAttempts } : {})
        });
        continue;
      }

      const parsedItems = parseNewsFeed(text, source, now)
        .filter((item) => !input.fresh || isFreshNewsItem(item, now))
        .filter((item) => newsItemMatchesQuery(item, query))
        .slice(0, maxResults);
      items.push(...parsedItems);
      if (input.fresh && wantsArchiveFallback(source, wantedCategories, parsedItems)) {
        for (const archiveSource of archiveSourcesFor(source, now)) {
          const archiveRetryAttempts: FetchRetryAttempt[] = [];
          try {
            const archiveResponse = await fetchWithTimeoutRetry(
              fetcher,
              archiveSource.url,
              input.abortSignal,
              options.timeoutMs ?? 8_000,
              "Mozilla/5.0 CoTree/0.1 NewsSearch",
              {},
              {
                attempts: options.retry?.attempts ?? 1,
                baseDelayMs: options.retry?.baseDelayMs ?? 250,
                maxDelayMs: options.retry?.maxDelayMs ?? 3_000,
                sleep: options.retry?.sleep,
                onAttempt: (attempt) => {
                  archiveRetryAttempts.push(attempt);
                  options.retry?.onAttempt?.(attempt);
                }
              }
            );
            const archiveText = await archiveResponse.text();
            if (!archiveResponse.ok) {
              attempts.push({
                source: archiveSource.name,
                url: archiveSource.url,
                ok: false,
                status: archiveResponse.status,
                error: `${archiveResponse.status} ${archiveResponse.statusText}`,
                ...(archiveRetryAttempts.length > 0 ? { retryAttempts: archiveRetryAttempts } : {})
              });
              continue;
            }
            const archiveItems = parseChinaNewsArchive(archiveText, archiveSource, now).slice(0, maxResults);
            items.push(...archiveItems);
            attempts.push({
              source: archiveSource.name,
              url: archiveSource.url,
              ok: true,
              status: archiveResponse.status,
              itemCount: archiveItems.length,
              ...(archiveRetryAttempts.length > 0 ? { retryAttempts: archiveRetryAttempts } : {})
            });
          } catch (error) {
            attempts.push({
              source: archiveSource.name,
              url: archiveSource.url,
              ok: false,
              error: error instanceof Error ? error.message : String(error),
              ...(archiveRetryAttempts.length > 0 ? { retryAttempts: archiveRetryAttempts } : {})
            });
          }
        }
      }
      attempts.push({
        source: source.name,
        url: source.url,
        ok: true,
        status: response.status,
        itemCount: parsedItems.length,
        ...(retryAttempts.length > 0 ? { retryAttempts } : {})
      });
    } catch (error) {
      attempts.push({
        source: source.name,
        url: source.url,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...(retryAttempts.length > 0 ? { retryAttempts } : {})
      });
    }
  }

  const deduped = selectNewsItems(dedupeNewsItems(items).sort(compareNewsItems), maxResults, wantedCategories);
  if (deduped.length === 0) {
    const failures = attempts.filter((attempt) => !attempt.ok);
    if (attempts.length > 0 && failures.length === attempts.length) {
      throw new Error(`All news sources failed: ${failures.map((attempt) => `${attempt.source}:${attempt.error ?? attempt.status ?? "failed"}`).join("; ")}`);
    }
  }

  return {
    query,
    asOf,
    items: deduped,
    sources: [...new Set(deduped.map((item) => item.source))],
    attempts,
    quality: {
      itemCount: deduped.length,
      sourceCount: new Set(deduped.map((item) => item.source)).size,
      categories: [...new Set(deduped.map((item) => item.category).filter((value): value is string => Boolean(value)))]
    }
  };
}

export function newsSearchOutputToJson(output: NewsSearchOutput): JsonObject {
  return {
    query: output.query,
    asOf: output.asOf,
    items: output.items.map((item) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      ...(item.category ? { category: item.category } : {}),
      ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      ...(item.summary ? { summary: item.summary } : {})
    })),
    sources: output.sources,
    attempts: output.attempts.map((attempt) => ({
      source: attempt.source,
      url: attempt.url,
      ok: attempt.ok,
      ...(attempt.status !== undefined ? { status: attempt.status } : {}),
      ...(attempt.itemCount !== undefined ? { itemCount: attempt.itemCount } : {}),
      ...(attempt.error ? { error: attempt.error } : {}),
      ...(attempt.retryAttempts && attempt.retryAttempts.length > 0
        ? {
            retryAttempts: attempt.retryAttempts.map((retryAttempt) => ({
              attempt: retryAttempt.attempt,
              maxAttempts: retryAttempt.maxAttempts,
              ok: retryAttempt.ok,
              retryable: retryAttempt.retryable,
              ...(retryAttempt.status !== undefined ? { status: retryAttempt.status } : {}),
              ...(retryAttempt.error ? { error: retryAttempt.error } : {}),
              ...(retryAttempt.delayMs !== undefined ? { delayMs: retryAttempt.delayMs } : {})
            }))
          }
        : {})
    })),
    quality: output.quality
  };
}

function parseNewsFeed(xml: string, source: NewsFeedSource, now: Date): NewsSearchItem[] {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].flatMap((match) => parseNewsItem(match[0], source, now));
  if (items.length > 0) {
    return items;
  }
  return parseAtomEntries(xml, source, now);
}

function parseNewsItem(block: string, source: NewsFeedSource, now: Date): NewsSearchItem[] {
  const title = cleanXmlText(firstTag(block, "title"));
  const url = cleanXmlText(firstTag(block, "link"));
  if (!title || !isHttpUrl(url)) {
    return [];
  }
  const rawDate = cleanXmlText(firstTag(block, "pubDate") || firstTag(block, "date"));
  const publishedAt = normalizePublishedAt(rawDate, now);
  const summary = cleanXmlText(firstTag(block, "description"));
  return [
    {
      title,
      url,
      source: source.name,
      category: inferNewsCategory(url, title, source.category),
      ...(publishedAt ? { publishedAt } : {}),
      ...(summary && summary !== title ? { summary: truncateText(summary, 240) } : {})
    }
  ];
}

function parseAtomEntries(xml: string, source: NewsFeedSource, now: Date): NewsSearchItem[] {
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].flatMap((match) => {
    const block = match[0];
    const title = cleanXmlText(firstTag(block, "title"));
    const link = atomLink(block);
    if (!title || !isHttpUrl(link)) {
      return [];
    }
    const rawDate = cleanXmlText(firstTag(block, "updated") || firstTag(block, "published"));
    const publishedAt = normalizePublishedAt(rawDate, now);
    const summary = cleanXmlText(firstTag(block, "summary") || firstTag(block, "content"));
    return [
      {
        title,
        url: link,
        source: source.name,
        category: inferNewsCategory(link, title, source.category),
        ...(publishedAt ? { publishedAt } : {}),
        ...(summary && summary !== title ? { summary: truncateText(summary, 240) } : {})
      }
    ];
  });
}

function parseChinaNewsArchive(html: string, source: NewsFeedSource, now: Date): NewsSearchItem[] {
  const decoded = decodePossiblyMisdecodedUtf8(html);
  const items: NewsSearchItem[] = [];
  const itemPattern = /<li\b[\s\S]*?<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<div\b[^>]*class=["']dd_time["'][^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/li>/gi;
  for (const match of decoded.matchAll(itemPattern)) {
    const url = normalizeChinaNewsUrl(cleanXmlText(match[1] ?? ""));
    const title = cleanXmlText(match[2] ?? "");
    if (!title || !isHttpUrl(url) || !isChinaNewsArchiveArticleUrl(url, source.category, now)) {
      continue;
    }
    const publishedAt = normalizeChinaNewsArchiveTime(cleanXmlText(match[3] ?? ""), now);
    items.push({
      title,
      url,
      source: source.name,
      category: source.category,
      ...(publishedAt ? { publishedAt } : {})
    });
  }
  return items;
}

function firstTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function atomLink(block: string): string {
  const linkTag = block.match(/<link\b([^>]*)\/?>/i);
  return cleanXmlText(attr(linkTag?.[1] ?? "", "href"));
}

function attr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function cleanXmlText(value: string | undefined): string {
  return decodeHtml(
    (value ?? "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodePossiblyMisdecodedUtf8(value: string): string {
  if (!/[ÃÂåæä]/.test(value)) {
    return value;
  }
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  } catch {
    return value;
  }
}

function normalizeChinaNewsUrl(value: string): string {
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  if (value.startsWith("/")) {
    return `https://www.chinanews.com.cn${value}`;
  }
  return value;
}

function normalizeChinaNewsArchiveTime(value: string, now: Date): string | undefined {
  const match = value.match(/(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!match) {
    return undefined;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const hour = Number(match[3]);
  const minute = Number(match[4]);
  if (!month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return undefined;
  }
  const date = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day, hour - 8, minute));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isChinaNewsArchiveArticleUrl(url: string, category: string, now: Date): boolean {
  const year = now.getUTCFullYear();
  const datePart = `${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const expectedPath = category === "international" ? "gj" : category === "finance" ? "cj" : "gn";
  return new RegExp(`/(?:${expectedPath})/${year}/${datePart}/\\d+\\.shtml$`, "i").test(url);
}

function normalizePublishedAt(value: string, now: Date): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const futureToleranceMs = 10 * 60 * 1000;
  if (parsed.getTime() > now.getTime() + futureToleranceMs) {
    return undefined;
  }
  return parsed.toISOString();
}

function isFreshNewsItem(item: NewsSearchItem, now: Date): boolean {
  if (!item.publishedAt) {
    return item.source.toLowerCase().includes("latest");
  }
  const parsed = Date.parse(item.publishedAt);
  if (Number.isNaN(parsed)) {
    return true;
  }
  const ageMs = now.getTime() - parsed;
  return ageMs >= -10 * 60 * 1000 && ageMs <= 72 * 60 * 60 * 1000;
}

function normalizeCategories(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function newsItemMatchesQuery(item: NewsSearchItem, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || /^(today|latest|current|news|today news|今日新闻|今天新闻|新闻|最新新闻|今日|今天|最新|要闻)$/i.test(normalizedQuery)) {
    return true;
  }
  const terms = tokenize(normalizedQuery).filter((term) => !genericNewsTerms.has(term));
  if (terms.length === 0) {
    return true;
  }
  const haystack = `${item.title} ${item.summary ?? ""} ${item.source} ${item.category ?? ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

const genericNewsTerms = new Set(["today", "latest", "current", "news", "headline", "headlines", "今日", "今天", "新闻", "最新", "要闻"]);

function tokenize(value: string): string[] {
  return [...(value.match(/[a-z0-9]{2,}/gi) ?? []), ...(value.match(/[\u4e00-\u9fff]{2,}/g) ?? [])].map((term) => term.toLowerCase());
}

function dedupeNewsItems(items: NewsSearchItem[]): NewsSearchItem[] {
  const seen = new Set<string>();
  const output: NewsSearchItem[] = [];
  for (const item of items) {
    const key = canonicalNewsKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function selectNewsItems(items: NewsSearchItem[], maxResults: number, wantedCategories: Set<string>): NewsSearchItem[] {
  const requested = categoryOrder.filter((category) => wantedCategories.has(category));
  if (wantedCategories.has("all") || requested.length <= 1) {
    return items.slice(0, maxResults);
  }

  const selected: NewsSearchItem[] = [];
  const selectedKeys = new Set<string>();
  const perCategory = Math.max(2, Math.ceil(maxResults / requested.length));
  for (const category of requested) {
    for (const item of items.filter((candidate) => candidate.category === category).slice(0, perCategory)) {
      const key = canonicalNewsKey(item);
      if (selectedKeys.has(key) || selected.length >= maxResults) {
        continue;
      }
      selected.push(item);
      selectedKeys.add(key);
    }
  }

  for (const item of items) {
    if (selected.length >= maxResults) {
      break;
    }
    const key = canonicalNewsKey(item);
    if (!selectedKeys.has(key)) {
      selected.push(item);
      selectedKeys.add(key);
    }
  }

  return selected.sort(compareNewsItems);
}

const categoryOrder = ["domestic", "international", "finance", "latest"];

function wantsArchiveFallback(source: NewsFeedSource, wantedCategories: Set<string>, parsedItems: NewsSearchItem[]): boolean {
  if (source.category !== "latest") {
    return false;
  }
  const requested = categoryOrder.filter((category) => wantedCategories.has(category) && category !== "latest");
  if (requested.length === 0) {
    return false;
  }
  return requested.some((category) => parsedItems.filter((item) => item.category === category).length < 2);
}

function archiveSourcesFor(source: NewsFeedSource, now: Date): NewsFeedSource[] {
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return [
    {
      name: `${source.name} domestic archive`,
      category: "domestic",
      url: `https://www.chinanews.com.cn/scroll-news/gn/${datePath}/news.shtml`
    },
    {
      name: `${source.name} international archive`,
      category: "international",
      url: `https://www.chinanews.com.cn/scroll-news/gj/${datePath}/news.shtml`
    },
    {
      name: `${source.name} finance archive`,
      category: "finance",
      url: `https://www.chinanews.com.cn/scroll-news/cj/${datePath}/news.shtml`
    }
  ];
}

function inferNewsCategory(url: string, title: string, fallback: string): string {
  const normalizedUrl = url.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  if (/\/(?:gj|world|international)\//i.test(normalizedUrl) || /world|international|国际/.test(normalizedTitle)) {
    return "international";
  }
  if (/\/(?:cj|finance|business|money|stock)\//i.test(normalizedUrl) || /finance|business|market|财经|金融|股市|经济/.test(normalizedTitle)) {
    return "finance";
  }
  if (/\/(?:gn|china|politics|society)\//i.test(normalizedUrl) || /国内|中国|全国|国家/.test(normalizedTitle)) {
    return "domestic";
  }
  return fallback;
}

function canonicalNewsKey(item: NewsSearchItem): string {
  try {
    const url = new URL(item.url);
    url.hash = "";
    url.search = "";
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/g, "")}`;
  } catch {
    return item.url || item.title;
  }
}

function compareNewsItems(a: NewsSearchItem, b: NewsSearchItem): number {
  const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  if (aTime !== bTime) {
    return bTime - aTime;
  }
  return a.title.localeCompare(b.title);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
}
