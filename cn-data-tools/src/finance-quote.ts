// FinanceQuote logic (blueprint 04 §B1). Moved verbatim from packages/browser-runtime
// so the capability lives in the cn-data-tools plugin. Transport is injectable; the
// FinanceInstrumentAlias shape mirrors browser-runtime so runtime-supplied (skill)
// aliases thread through structurally without a cross-package dependency.

import type { PluginJsonValue } from "@cotree/plugin-sdk";

type JsonObject = { [key: string]: PluginJsonValue };
import { fetchWithTimeoutRetry, type CnDataFetch, type FetchRetryAttempt } from "./http.js";

/** Custom instrument alias (name/aliases -> code/exchange). Mirrors browser-runtime FinanceInstrumentAlias. */
export type FinanceInstrumentAlias = {
  code?: string;
  exchange?: "SH" | "SZ" | "BJ";
  symbol?: string;
  market?: "CN-A";
  name?: string;
  aliases?: string[];
};

export type FinanceQuoteInput = {
  symbol: string;
  name?: string;
  asOfDate?: string;
  abortSignal?: AbortSignal;
};

export type FinanceQuoteOutput = {
  symbol: string;
  code: string;
  exchange: "SH" | "SZ" | "BJ";
  market: "CN-A";
  name?: string;
  latest: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  bid1?: number;
  ask1?: number;
  timestamp: string;
  tradeDate: string;
  tradeTime: string;
  marketStatus: "trading" | "closed" | "preopen" | "timestamp_invalid";
  calendarNote: string;
  marketCalendar: MarketCalendarContext;
  source: {
    name: string;
    url: string;
  };
  crossChecks: Array<{
    name: string;
    url: string;
    status: "confirmed" | "available" | "fallback" | "failed";
    latest?: number;
    timestamp?: string;
    error?: string;
  }>;
  evidenceBatch: FinanceEvidenceBatch;
  evidenceSummary: string;
  attempts: FinanceQuoteAttempt[];
};

export type FinanceEvidenceBatch = {
  kind: "finance_quote";
  status: "confirmed" | "partial" | "fallback";
  query: string;
  confirmedAt: string;
  instrument: {
    code: string;
    exchange: "SH" | "SZ" | "BJ";
    symbol: string;
    name?: string;
  };
  marketStatus: FinanceQuoteOutput["marketStatus"];
  calendarNote: string;
  marketCalendar: MarketCalendarContext;
  tradeDate: string;
  tradeTime: string;
  price: number;
  change: number;
  changePercent: number;
  sources: Array<{
    name: string;
    url: string;
    status: "confirmed" | "available" | "fallback" | "failed";
    observations: string[];
  }>;
  pending: string[];
};

export type FinanceQuoteAttempt = {
  provider: "eastmoney-search" | "sina-hq" | "eastmoney-quote";
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
  retryAttempts: FetchRetryAttempt[];
};

export type MarketCalendarContext = {
  market: "CN-A";
  requestDate: string;
  requestDayOfWeek: string;
  returnedTradeDate: string;
  latestTradingDate: string;
  isRequestTradingDay: boolean;
  isRequestDateSameAsTradeDate: boolean;
  status: FinanceQuoteOutput["marketStatus"];
  note: string;
};

export type FinanceQuoteOptions = {
  fetcher?: CnDataFetch;
  instruments?: FinanceInstrumentAlias[];
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

type SinaQuote = {
  name: string;
  open: number;
  previousClose: number;
  latest: number;
  high: number;
  low: number;
  bid1?: number;
  ask1?: number;
  volume: number;
  amount: number;
  date: string;
  time: string;
};

type CnStockInstrument = {
  code: string;
  exchange: "SH" | "SZ" | "BJ";
  symbol: string;
  sinaSymbol: string;
  eastmoneySecid: string;
  name?: string;
};

type EastmoneyQuote = {
  name?: string;
  latest?: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  amount?: number;
  timestamp?: string;
};

export async function getFinanceQuote(input: FinanceQuoteInput, options: FinanceQuoteOptions = {}): Promise<FinanceQuoteOutput> {
  const query = input.symbol || input.name || "";
  const attempts: FinanceQuoteAttempt[] = [];
  const fetcher = options.fetcher ?? fetch;
  const instrument = resolveCnStockInstrument(query, options.instruments)
    ?? await searchEastmoneyInstrument(query, fetcher, input.abortSignal, options, attempts);
  if (!instrument) {
    const resolutionError = attempts.find((attempt) => attempt.provider === "eastmoney-search")?.error;
    throw new Error(`FinanceQuote requires a stock symbol or recognizable stock name${resolutionError ? `; name resolution failed: ${resolutionError}` : ""}.`);
  }

  const sinaUrl = `https://hq.sinajs.cn/list=${instrument.sinaSymbol}`;
  const sinaRetryAttempts: FetchRetryAttempt[] = [];
  let quote: SinaQuote | undefined;
  let sinaStatus: number | undefined;
  let sinaError: string | undefined;

  try {
    const response = await fetchWithTimeoutRetry(
      fetcher,
      sinaUrl,
      input.abortSignal,
      options.timeoutMs ?? 8_000,
      "Mozilla/5.0 CoTree/0.1 FinanceQuote",
      {
        headers: {
          Referer: `https://finance.sina.com.cn/realstock/company/${instrument.sinaSymbol}/nc.shtml`
        }
      },
      retryOptions(options, sinaRetryAttempts)
    );
    sinaStatus = response.status;
    const text = await response.text();
    if (response.ok) {
      quote = parseSinaQuote(text);
      if (!quote) {
        sinaError = "Sina quote response did not contain a parseable quote string.";
      }
    } else {
      sinaError = `${response.status} ${response.statusText}`;
    }
  } catch (error) {
    sinaError = error instanceof Error ? error.message : String(error);
  }

  attempts.push({
    provider: "sina-hq",
    url: sinaUrl,
    ok: Boolean(quote),
    ...(sinaStatus !== undefined ? { status: sinaStatus } : {}),
    ...(sinaError ? { error: sinaError } : {}),
    retryAttempts: sinaRetryAttempts
  });

  const eastmoney = await fetchEastmoneyQuote({
    instrument,
    fetcher,
    abortSignal: input.abortSignal,
    options,
    attempts
  });

  const primaryQuote = quote ?? quoteFromEastmoney(eastmoney.quote, instrument);
  const primaryProvider: FinanceQuoteAttempt["provider"] = quote ? "sina-hq" : "eastmoney-quote";
  if (!primaryQuote) {
    throw new Error(`Known finance quote sources failed: Sina hq unavailable (${sinaError ?? "source returned no quote and no error detail"}); Eastmoney ${eastmoney.quote ? "available but incomplete" : "unavailable"}.`);
  }

  const change = primaryProvider === "eastmoney-quote" && eastmoney.quote?.change !== undefined
    ? eastmoney.quote.change
    : round2(primaryQuote.latest - primaryQuote.previousClose);
  const changePercent = primaryProvider === "eastmoney-quote" && eastmoney.quote?.changePercent !== undefined
    ? eastmoney.quote.changePercent
    : primaryQuote.previousClose === 0 ? 0 : round2((change / primaryQuote.previousClose) * 100);
  const symbol = `${instrument.code}.${instrument.exchange}`;
  const timestamp = `${primaryQuote.date} ${primaryQuote.time}`;
  const name = input.name ?? (primaryQuote.name || instrument.name);
  const source = {
    name: primaryProvider === "sina-hq" ? "Sina Finance hq.sinajs.cn" : "Eastmoney quote API",
    url: primaryProvider === "sina-hq" ? sinaUrl : eastmoney.url
  };
  const crossChecks = buildCrossChecks(instrument, eastmoney, primaryQuote, timestamp, primaryProvider, sinaError);
  const marketStatus = inferMarketStatus(primaryQuote.date, primaryQuote.time);
  const marketCalendar = buildMarketCalendarContext({
    requestDate: input.asOfDate ?? isoDateInTimeZone(options.now ?? new Date(), "Asia/Shanghai"),
    tradeDate: primaryQuote.date,
    tradeTime: primaryQuote.time,
    status: marketStatus
  });
  const calendarNote = marketCalendar.note;
  const evidenceBatch = buildEvidenceBatch({
    input,
    instrument,
    name,
    quote: primaryQuote,
    timestamp,
    change,
    changePercent,
    marketStatus,
    calendarNote,
    marketCalendar,
    source,
    sourceStatus: primaryProvider === "sina-hq" ? "confirmed" : "fallback",
    crossChecks
  });
  return {
    symbol,
    code: instrument.code,
    exchange: instrument.exchange,
    market: "CN-A",
    ...(name ? { name } : {}),
    latest: primaryQuote.latest,
    previousClose: primaryQuote.previousClose,
    open: primaryQuote.open,
    high: primaryQuote.high,
    low: primaryQuote.low,
    change,
    changePercent,
    volume: primaryQuote.volume,
    amount: primaryQuote.amount,
    ...(primaryQuote.bid1 !== undefined ? { bid1: primaryQuote.bid1 } : {}),
    ...(primaryQuote.ask1 !== undefined ? { ask1: primaryQuote.ask1 } : {}),
    timestamp,
    tradeDate: primaryQuote.date,
    tradeTime: primaryQuote.time,
    marketStatus,
    calendarNote,
    marketCalendar,
    source,
    crossChecks,
    evidenceBatch,
    evidenceSummary: `${primaryQuote.name || symbol} ${symbol} ${timestamp}: latest ${primaryQuote.latest}, change ${change} (${changePercent}%). ${calendarNote}`,
    attempts
  };
}

export function financeQuoteOutputToJson(output: FinanceQuoteOutput): JsonObject {
  return {
    symbol: output.symbol,
    code: output.code,
    exchange: output.exchange,
    market: output.market,
    ...(output.name ? { name: output.name } : {}),
    latest: output.latest,
    previousClose: output.previousClose,
    open: output.open,
    high: output.high,
    low: output.low,
    change: output.change,
    changePercent: output.changePercent,
    volume: output.volume,
    amount: output.amount,
    ...(output.bid1 !== undefined ? { bid1: output.bid1 } : {}),
    ...(output.ask1 !== undefined ? { ask1: output.ask1 } : {}),
    timestamp: output.timestamp,
    tradeDate: output.tradeDate,
    tradeTime: output.tradeTime,
    marketStatus: output.marketStatus,
    calendarNote: output.calendarNote,
    marketCalendar: output.marketCalendar,
    source: output.source,
    crossChecks: output.crossChecks,
    evidenceBatch: evidenceBatchToJson(output.evidenceBatch),
    evidenceSummary: output.evidenceSummary,
    attempts: output.attempts.map((attempt) => ({
      provider: attempt.provider,
      url: attempt.url,
      ok: attempt.ok,
      ...(attempt.status !== undefined ? { status: attempt.status } : {}),
      ...(attempt.error ? { error: attempt.error } : {}),
      retryAttempts: attempt.retryAttempts.map(retryAttemptToJson)
    }))
  };
}

function retryOptions(options: FinanceQuoteOptions, attempts: FetchRetryAttempt[]): NonNullable<Parameters<typeof fetchWithTimeoutRetry>[6]> {
  return {
    attempts: options.retry?.attempts ?? 2,
    baseDelayMs: options.retry?.baseDelayMs ?? 200,
    maxDelayMs: options.retry?.maxDelayMs ?? 2_000,
    sleep: options.retry?.sleep,
    onAttempt: (attempt) => {
      attempts.push(attempt);
      options.retry?.onAttempt?.(attempt);
    }
  };
}

async function fetchEastmoneyQuote(input: {
  instrument: CnStockInstrument;
  fetcher: CnDataFetch;
  abortSignal?: AbortSignal;
  options: FinanceQuoteOptions;
  attempts: FinanceQuoteAttempt[];
}): Promise<{ url: string; quote?: EastmoneyQuote; error?: string; status?: number }> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${input.instrument.eastmoneySecid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f168,f169,f170,f292`;
  const retryAttempts: FetchRetryAttempt[] = [];
  let status: number | undefined;
  let error: string | undefined;
  let quote: EastmoneyQuote | undefined;
  try {
    const response = await fetchWithTimeoutRetry(
      input.fetcher,
      url,
      input.abortSignal,
      input.options.timeoutMs ?? 8_000,
      "Mozilla/5.0 CoTree/0.1 FinanceQuote eastmoney",
      {},
      retryOptions(input.options, retryAttempts)
    );
    status = response.status;
    const text = await response.text();
    if (response.ok) {
      quote = parseEastmoneyQuote(text);
      if (!quote) {
        error = "Eastmoney quote response did not contain parseable quote data.";
      }
    } else {
      error = `${response.status} ${response.statusText}`;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  input.attempts.push({
    provider: "eastmoney-quote",
    url,
    ok: Boolean(quote),
    ...(status !== undefined ? { status } : {}),
    ...(error ? { error } : {}),
    retryAttempts
  });
  return {
    url,
    ...(quote ? { quote } : {}),
    ...(error ? { error } : {}),
    ...(status !== undefined ? { status } : {})
  };
}

async function searchEastmoneyInstrument(
  query: string,
  fetcher: CnDataFetch,
  abortSignal: AbortSignal | undefined,
  options: FinanceQuoteOptions,
  attempts: FinanceQuoteAttempt[]
): Promise<CnStockInstrument | undefined> {
  const normalized = query.trim();
  if (!normalized) return undefined;
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(normalized)}&type=14&token=D43BF722C8E33BECE2ACD1BD6E6FDE05&count=10`;
  const retryAttempts: FetchRetryAttempt[] = [];
  let status: number | undefined;
  let error: string | undefined;
  let instrument: CnStockInstrument | undefined;
  try {
    const response = await fetchWithTimeoutRetry(
      fetcher,
      url,
      abortSignal,
      options.timeoutMs ?? 5_000,
      "Mozilla/5.0 CoTree/0.1 FinanceQuote eastmoney-search",
      {},
      {
        attempts: 1,
        onAttempt: (attempt) => {
          retryAttempts.push(attempt);
          options.retry?.onAttempt?.(attempt);
        }
      }
    );
    status = response.status;
    if (response.ok) {
      instrument = parseEastmoneyInstrument(await response.text());
      if (!instrument) error = `No A-share instrument matched ${normalized}.`;
    } else {
      error = `${response.status} ${response.statusText}`;
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  attempts.push({
    provider: "eastmoney-search",
    url,
    ok: Boolean(instrument),
    ...(status !== undefined ? { status } : {}),
    ...(error ? { error } : {}),
    retryAttempts
  });
  return instrument;
}

function parseEastmoneyInstrument(value: string): CnStockInstrument | undefined {
  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    const table = payload.QuotationCodeTable;
    if (!table || typeof table !== "object" || Array.isArray(table)) return undefined;
    const data = (table as Record<string, unknown>).Data;
    if (!Array.isArray(data)) return undefined;
    for (const candidate of data) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const record = candidate as Record<string, unknown>;
      const code = typeof record.Code === "string" ? record.Code : "";
      const classify = typeof record.Classify === "string" ? record.Classify : "";
      if (!/^[03689]\d{5}$/.test(code) || (classify && classify !== "AStock")) continue;
      const exchange = exchangeForCode(code, typeof record.SecurityTypeName === "string" && record.SecurityTypeName.startsWith("沪") ? "SH" : undefined);
      return instrumentForCode(code, exchange, typeof record.Name === "string" ? record.Name : undefined);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveCnStockInstrument(value: string, instruments: FinanceInstrumentAlias[] = []): CnStockInstrument | undefined {
  const normalized = value.trim();
  const skillInstrument = instrumentFromAliases(normalized, instruments);
  if (skillInstrument) {
    return skillInstrument;
  }

  const explicit = normalized.match(/\b(?:(sh|sz|bj|SH|SZ|BJ)\s*)?([03689]\d{5})(?:\.(sh|sz|ss|SZ|SH|SS|bj|BJ))?\b/);
  if (!explicit) {
    return undefined;
  }

  const code = explicit[2];
  if (!code) {
    return undefined;
  }
  const exchange = exchangeForCode(code, explicit[1] ?? explicit[3]);
  return instrumentForCode(code, exchange);
}

function instrumentFromAliases(value: string, instruments: FinanceInstrumentAlias[]): CnStockInstrument | undefined {
  const normalized = normalizeAlias(value);
  if (!normalized) {
    return undefined;
  }

  for (const instrument of instruments) {
    const candidate = instrumentFromAliasRecord(instrument);
    if (!candidate) {
      continue;
    }
    const labels = [
      instrument.symbol,
      instrument.code,
      instrument.name,
      candidate.symbol,
      ...stringArray(instrument.aliases)
    ];
    if (labels.some((label) => label && aliasMatches(normalized, label))) {
      return candidate;
    }
  }
  return undefined;
}

function instrumentFromAliasRecord(input: FinanceInstrumentAlias): CnStockInstrument | undefined {
  if (input.market && input.market !== "CN-A") {
    return undefined;
  }
  const symbol = input.symbol?.trim();
  const symbolMatch = symbol?.match(/^([03689]\d{5})\.(SH|SZ|BJ|SS)$/i);
  const code = input.code?.trim() || symbolMatch?.[1];
  if (!code || !/^[03689]\d{5}$/.test(code)) {
    return undefined;
  }
  const exchange = exchangeForCode(code, input.exchange ?? symbolMatch?.[2]);
  return instrumentForCode(code, exchange, input.name?.trim() || undefined);
}

function aliasMatches(query: string, label: string): boolean {
  const normalizedLabel = normalizeAlias(label);
  return Boolean(normalizedLabel && (query === normalizedLabel || query.includes(normalizedLabel) || normalizedLabel.includes(query)));
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function instrumentForCode(code: string, exchange: CnStockInstrument["exchange"], name?: string): CnStockInstrument {
  const symbol = `${code}.${exchange}`;
  return {
    code,
    exchange,
    symbol,
    sinaSymbol: `${exchange.toLowerCase()}${code}`,
    eastmoneySecid: `${eastmoneyMarketId(exchange)}.${code}`,
    ...(name ? { name } : {})
  };
}

function exchangeForCode(code: string, explicit?: string): CnStockInstrument["exchange"] {
  const normalized = explicit?.toUpperCase();
  if (normalized === "SH" || normalized === "SS") {
    return "SH";
  }
  if (normalized === "SZ") {
    return "SZ";
  }
  if (normalized === "BJ") {
    return "BJ";
  }
  if (code.startsWith("6")) {
    return "SH";
  }
  if (code.startsWith("8") || code.startsWith("9")) {
    return "BJ";
  }
  return "SZ";
}

function eastmoneyMarketId(exchange: CnStockInstrument["exchange"]): number {
  if (exchange === "SH") {
    return 1;
  }
  if (exchange === "SZ") {
    return 0;
  }
  return 0;
}

function parseSinaQuote(text: string): SinaQuote | undefined {
  const match = text.match(/hq_str_(?:sh|sz|bj)\d{6}\s*=\s*"([^"]*)"/) ?? text.match(/hqstr(?:sh|sz|bj)\d{6}\s*=\s*"([^"]*)"/);
  const raw = match?.[1];
  if (!raw) {
    return undefined;
  }
  const fields = raw.split(",");
  const latest = numberAt(fields, 3);
  const previousClose = numberAt(fields, 2);
  const open = numberAt(fields, 1);
  const high = numberAt(fields, 4);
  const low = numberAt(fields, 5);
  const volume = numberAt(fields, 8);
  const amount = numberAt(fields, 9);
  const date = fields[30]?.trim();
  const time = fields[31]?.trim();
  if ([latest, previousClose, open, high, low, volume, amount].some((value) => value === undefined) || !date || !time) {
    return undefined;
  }
  return {
    name: fields[0]?.trim() ?? "",
    open: open!,
    previousClose: previousClose!,
    latest: latest!,
    high: high!,
    low: low!,
    bid1: numberAt(fields, 11),
    ask1: numberAt(fields, 21),
    volume: volume!,
    amount: amount!,
    date,
    time
  };
}

function parseEastmoneyQuote(text: string): EastmoneyQuote | undefined {
  try {
    const parsed = JSON.parse(text) as { data?: Record<string, unknown> | null };
    const data = parsed.data;
    if (!data) {
      return undefined;
    }
    const latest = eastmoneyPrice(data.f43);
    return {
      name: typeof data.f58 === "string" ? data.f58 : undefined,
      latest,
      previousClose: eastmoneyPrice(data.f60),
      open: eastmoneyPrice(data.f46),
      high: eastmoneyPrice(data.f44),
      low: eastmoneyPrice(data.f45),
      change: eastmoneyPrice(data.f169),
      changePercent: eastmoneyPrice(data.f170),
      volume: typeof data.f47 === "number" && Number.isFinite(data.f47) && data.f47 >= 0 ? data.f47 : undefined,
      amount: typeof data.f48 === "number" && Number.isFinite(data.f48) && data.f48 >= 0 ? data.f48 : undefined,
      timestamp: typeof data.f292 === "number" ? String(data.f292) : undefined
    };
  } catch {
    return undefined;
  }
}

function quoteFromEastmoney(quote: EastmoneyQuote | undefined, instrument: CnStockInstrument): SinaQuote | undefined {
  if (
    quote?.latest === undefined ||
    quote.previousClose === undefined ||
    quote.open === undefined ||
    quote.high === undefined ||
    quote.low === undefined
  ) {
    return undefined;
  }
  const parsedTimestamp = parseEastmoneyTimestamp(quote.timestamp);
  return {
    name: quote.name ?? instrument.name ?? instrument.symbol,
    open: quote.open,
    previousClose: quote.previousClose,
    latest: quote.latest,
    high: quote.high,
    low: quote.low,
    volume: quote.volume ?? 0,
    amount: quote.amount ?? 0,
    date: parsedTimestamp.date,
    time: parsedTimestamp.time
  };
}

function parseEastmoneyTimestamp(value: string | undefined): { date: string; time: string } {
  if (value && /^\d{14}$/.test(value)) {
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      time: `${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`
    };
  }
  const now = new Date();
  return {
    date: isoDateInTimeZone(now, "Asia/Shanghai"),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now)
  };
}

function buildCrossChecks(
  instrument: CnStockInstrument,
  eastmoney: { url: string; quote?: EastmoneyQuote; error?: string },
  quote: SinaQuote,
  timestamp: string,
  primaryProvider: FinanceQuoteAttempt["provider"],
  sinaError?: string
): FinanceQuoteOutput["crossChecks"] {
  const eastmoneyStatus = primaryProvider === "eastmoney-quote"
    ? "fallback"
    : eastmoney.quote?.latest !== undefined && valuesClose(eastmoney.quote.latest, quote.latest) ? "confirmed" : eastmoney.quote ? "available" : "failed";
  return [
    {
      name: "Sina Finance stock page",
      url: `https://finance.sina.com.cn/realstock/company/${instrument.sinaSymbol}/nc.shtml`,
      status: primaryProvider === "sina-hq" ? "available" : "failed",
      ...(sinaError ? { error: sinaError } : {})
    },
    {
      name: "Eastmoney quote API",
      url: eastmoney.url,
      status: eastmoneyStatus,
      ...(eastmoney.quote?.latest !== undefined ? { latest: eastmoney.quote.latest } : {}),
      ...(eastmoney.quote?.timestamp ? { timestamp: eastmoney.quote.timestamp } : {}),
      ...(eastmoney.error ? { error: eastmoney.error } : {})
    },
    {
      name: "Eastmoney stock page",
      url: `https://quote.eastmoney.com/${instrument.exchange === "SH" && instrument.code.startsWith("688") ? "kcb/" : ""}${instrument.symbol.toLowerCase()}.html`,
      status: "fallback",
      timestamp
    },
    {
      name: "10jqka stock page",
      url: `https://stockpage.10jqka.com.cn/${instrument.code}/`,
      status: "fallback",
      timestamp
    }
  ];
}

function buildEvidenceBatch(input: {
  input: FinanceQuoteInput;
  instrument: CnStockInstrument;
  name?: string;
  quote: SinaQuote;
  timestamp: string;
  change: number;
  changePercent: number;
  marketStatus: FinanceQuoteOutput["marketStatus"];
  calendarNote: string;
  marketCalendar: MarketCalendarContext;
  source: FinanceQuoteOutput["source"];
  sourceStatus: "confirmed" | "fallback";
  crossChecks: FinanceQuoteOutput["crossChecks"];
}): FinanceEvidenceBatch {
  const confirmedCrossChecks = input.crossChecks.filter((source) => source.status === "confirmed");
  const pending = [
    ...(confirmedCrossChecks.length === 0 ? ["Cross-check source did not confirm the Sina latest price; treat Sina as primary and verify with page/API if precision is critical."] : []),
    ...(input.sourceStatus === "fallback" ? ["Primary Sina quote was unavailable; Eastmoney quote API was used as fallback source."] : []),
    ...(input.marketStatus === "closed" ? [input.calendarNote] : [])
  ];
  return {
    kind: "finance_quote",
    status: input.sourceStatus === "fallback" ? "fallback" : confirmedCrossChecks.length > 0 ? "confirmed" : "partial",
    query: input.input.symbol || input.input.name || input.instrument.symbol,
    confirmedAt: new Date().toISOString(),
    instrument: {
      code: input.instrument.code,
      exchange: input.instrument.exchange,
      symbol: input.instrument.symbol,
      ...(input.name ? { name: input.name } : {})
    },
    marketStatus: input.marketStatus,
    calendarNote: input.calendarNote,
    marketCalendar: input.marketCalendar,
    tradeDate: input.quote.date,
    tradeTime: input.quote.time,
    price: input.quote.latest,
    change: input.change,
    changePercent: input.changePercent,
    sources: [
      {
        name: input.source.name,
        url: input.source.url,
        status: input.sourceStatus,
        observations: [
          `price=${input.quote.latest}`,
          `previousClose=${input.quote.previousClose}`,
          `tradeTime=${input.timestamp}`
        ]
      },
      ...input.crossChecks.map((source) => ({
        name: source.name,
        url: source.url,
        status: source.status,
        observations: [
          ...(source.latest !== undefined ? [`latest=${source.latest}`] : []),
          ...(source.timestamp ? [`timestamp=${source.timestamp}`] : []),
          ...(source.error ? [`error=${source.error}`] : [])
        ]
      }))
    ],
    pending
  };
}

function evidenceBatchToJson(batch: FinanceEvidenceBatch): JsonObject {
  return {
    kind: batch.kind,
    status: batch.status,
    query: batch.query,
    confirmedAt: batch.confirmedAt,
    instrument: batch.instrument,
    marketStatus: batch.marketStatus,
    calendarNote: batch.calendarNote,
    marketCalendar: batch.marketCalendar,
    tradeDate: batch.tradeDate,
    tradeTime: batch.tradeTime,
    price: batch.price,
    change: batch.change,
    changePercent: batch.changePercent,
    sources: batch.sources,
    pending: batch.pending
  };
}

function retryAttemptToJson(attempt: FetchRetryAttempt): JsonObject {
  return {
    attempt: attempt.attempt,
    maxAttempts: attempt.maxAttempts,
    ok: attempt.ok,
    retryable: attempt.retryable,
    ...(attempt.status !== undefined ? { status: attempt.status } : {}),
    ...(attempt.error ? { error: attempt.error } : {}),
    ...(attempt.delayMs !== undefined ? { delayMs: attempt.delayMs } : {})
  };
}

function eastmoneyPrice(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value === -1) {
    return undefined;
  }
  return round2(value / 100);
}

function inferMarketStatus(date: string, time: string): FinanceQuoteOutput["marketStatus"] {
  const day = dayOfWeekInShanghai(date);
  if (day === 0 || day === 6) {
    return "closed";
  }
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return "timestamp_invalid";
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const seconds = Number(match[3]);
  const value = hour * 60 * 60 + minute * 60 + seconds;
  const morningStart = 9 * 60 * 60 + 30 * 60;
  const morningEnd = 11 * 60 * 60 + 30 * 60;
  const afternoonStart = 13 * 60 * 60;
  const afternoonEnd = 15 * 60 * 60;
  if ((value >= morningStart && value <= morningEnd) || (value >= afternoonStart && value <= afternoonEnd)) {
    return "trading";
  }
  if (value >= 9 * 60 * 60 && value < morningStart) {
    return "preopen";
  }
  return "closed";
}

function buildMarketCalendarContext(input: {
  requestDate: string;
  tradeDate: string;
  tradeTime: string;
  status: FinanceQuoteOutput["marketStatus"];
}): MarketCalendarContext {
  const requestDay = dayOfWeekInShanghai(input.requestDate);
  const requestDayName = dayName(requestDay);
  const latestTradingDate = latestCnTradingDateOnOrBefore(input.requestDate);
  const isRequestTradingDay = requestDay >= 1 && requestDay <= 5;
  const isRequestDateSameAsTradeDate = input.requestDate === input.tradeDate;
  return {
    market: "CN-A",
    requestDate: input.requestDate,
    requestDayOfWeek: requestDayName,
    returnedTradeDate: input.tradeDate,
    latestTradingDate,
    isRequestTradingDay,
    isRequestDateSameAsTradeDate,
    status: input.status,
    note: marketCalendarNote({
      requestDate: input.requestDate,
      requestDayName,
      tradeDate: input.tradeDate,
      tradeTime: input.tradeTime,
      status: input.status,
      latestTradingDate,
      isRequestTradingDay,
      isRequestDateSameAsTradeDate
    })
  };
}

function marketCalendarNote(input: {
  requestDate: string;
  requestDayName: string;
  tradeDate: string;
  tradeTime: string;
  status: FinanceQuoteOutput["marketStatus"];
  latestTradingDate: string;
  isRequestTradingDay: boolean;
  isRequestDateSameAsTradeDate: boolean;
}): string {
  if (!input.isRequestDateSameAsTradeDate) {
    return `A-share request date ${input.requestDate} (${input.requestDayName}) does not match the returned trade date ${input.tradeDate}; use ${input.tradeDate} ${input.tradeTime} as the latest available session quote, not a live intraday tick.`;
  }
  if (!input.isRequestTradingDay) {
    return `A-share market is closed on the request date ${input.requestDate} (${input.requestDayName}); latest expected trading date is ${input.latestTradingDate}.`;
  }
  if (input.status === "closed") {
    return `A-share market is closed for the returned quote timestamp (${input.tradeDate} ${input.tradeTime}, ${input.requestDayName}); use this as the latest available session quote, not a live intraday tick.`;
  }
  if (input.status === "preopen") {
    return `A-share market is pre-open for the returned quote timestamp (${input.tradeDate} ${input.tradeTime}, ${input.requestDayName}).`;
  }
  if (input.status === "trading") {
    return `A-share market appears to be in trading hours for the returned quote timestamp (${input.tradeDate} ${input.tradeTime}, ${input.requestDayName}).`;
  }
  return `A-share market status is unknown for the returned quote timestamp (${input.tradeDate} ${input.tradeTime}, ${input.requestDayName}).`;
}

function latestCnTradingDateOnOrBefore(date: string): string {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(parsed);
    candidate.setUTCDate(parsed.getUTCDate() - offset);
    const iso = isoDateInTimeZone(candidate, "Asia/Shanghai");
    const day = dayOfWeekInShanghai(iso);
    if (day >= 1 && day <= 5) {
      return iso;
    }
  }
  return date;
}

function dayName(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? "unknown day";
}

function dayOfWeekInShanghai(date: string): number {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getUTCDay();
}

function isoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function valuesClose(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

function numberAt(fields: string[], index: number): number | undefined {
  const value = Number(fields[index]);
  return Number.isFinite(value) ? value : undefined;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
