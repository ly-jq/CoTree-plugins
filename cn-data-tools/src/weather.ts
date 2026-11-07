// WeatherGet logic (blueprint 04 §B1). Moved verbatim from packages/browser-runtime
// so the capability lives in the cn-data-tools plugin. Transport is injectable.

import type { PluginJsonValue } from "@cotree/plugin-sdk";

type JsonObject = { [key: string]: PluginJsonValue };
import { fetchWithTimeout, type CnDataFetch } from "./http.js";

export type WeatherOutput = {
  location: string;
  provider: "wttr.in";
  url: string;
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
};

export type WeatherCurrent = {
  observedAt?: string;
  temperatureC?: number;
  feelsLikeC?: number;
  humidityPercent?: number;
  windKph?: number;
  windDirection?: string;
  precipitationMm?: number;
  pressureHpa?: number;
  cloudCoverPercent?: number;
  visibilityKm?: number;
  description?: string;
};

export type WeatherForecastDay = {
  date: string;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  averageTemperatureC?: number;
  maxWindKph?: number;
  precipitationMm?: number;
  chanceOfRainPercent?: number;
  chanceOfSnowPercent?: number;
  description?: string;
};

export type WeatherOptions = {
  fetcher?: CnDataFetch;
  timeoutMs?: number;
};

type WttrPayload = {
  current_condition?: Array<Record<string, unknown>>;
  weather?: Array<Record<string, unknown>>;
};

export async function getWeather(
  input: {
    location: string;
    days?: number;
    abortSignal?: AbortSignal;
  },
  options: WeatherOptions = {}
): Promise<WeatherOutput> {
  const location = input.location.trim();
  if (!location) {
    throw new Error("WeatherGet requires a non-empty location.");
  }

  const days = Math.max(1, Math.min(input.days ?? 3, 3));
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
  const fetcher = options.fetcher ?? fetch;
  const response = await fetchWithTimeout(fetcher, url, input.abortSignal, options.timeoutMs ?? 8_000, "Mozilla/5.0 CoTree/0.1 WeatherGet");
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`weather provider failed: ${response.status} ${response.statusText}`);
  }

  const parsed = parseJson(text);
  const current = normalizeCurrent(parsed.current_condition?.[0]);
  const forecast = (parsed.weather ?? []).slice(0, days).flatMap(normalizeForecastDay);

  return {
    location,
    provider: "wttr.in",
    url,
    current,
    forecast
  };
}

export function weatherOutputToJson(output: WeatherOutput): JsonObject {
  return {
    location: output.location,
    provider: output.provider,
    url: output.url,
    current: compactJsonObject(output.current),
    forecast: output.forecast.map((day) => compactJsonObject(day))
  };
}

function parseJson(text: string): WttrPayload {
  try {
    return JSON.parse(text) as WttrPayload;
  } catch (error) {
    throw new Error(`weather provider returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeCurrent(value: Record<string, unknown> | undefined): WeatherCurrent {
  if (!value) {
    return {};
  }

  return compactObject({
    observedAt: stringField(value, "localObsDateTime") ?? stringField(value, "observation_time"),
    temperatureC: numberField(value, "temp_C"),
    feelsLikeC: numberField(value, "FeelsLikeC"),
    humidityPercent: numberField(value, "humidity"),
    windKph: numberField(value, "windspeedKmph"),
    windDirection: stringField(value, "winddir16Point"),
    precipitationMm: numberField(value, "precipMM"),
    pressureHpa: numberField(value, "pressure"),
    cloudCoverPercent: numberField(value, "cloudcover"),
    visibilityKm: numberField(value, "visibility"),
    description: weatherDescription(value)
  }) as WeatherCurrent;
}

function normalizeForecastDay(value: Record<string, unknown>): WeatherForecastDay[] {
  const date = stringField(value, "date");
  if (!date) {
    return [];
  }

  return [
    compactObject({
      date,
      minTemperatureC: numberField(value, "mintempC"),
      maxTemperatureC: numberField(value, "maxtempC"),
      averageTemperatureC: numberField(value, "avgtempC"),
      maxWindKph: numberField(value, "maxwindKmph"),
      precipitationMm: sumHourlyNumber(value, "precipMM"),
      chanceOfRainPercent: astronomyOrHourlyPercent(value, "chanceofrain"),
      chanceOfSnowPercent: astronomyOrHourlyPercent(value, "chanceofsnow"),
      description: forecastDescription(value)
    }) as WeatherForecastDay
  ];
}

function sumHourlyNumber(value: Record<string, unknown>, key: string): number | undefined {
  const hourly = Array.isArray(value.hourly) ? value.hourly : [];
  const values = hourly.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const parsed = numberField(item, key);
    return parsed === undefined ? [] : [parsed];
  });

  if (values.length === 0) {
    return undefined;
  }

  return Number(values.reduce((sum, item) => sum + item, 0).toFixed(2));
}

function forecastDescription(value: Record<string, unknown>): string | undefined {
  const hourly = Array.isArray(value.hourly) ? value.hourly : [];
  const noon = hourly.find((item): item is Record<string, unknown> => isObject(item) && stringField(item, "time") === "1200");
  const first = hourly.find(isObject);
  return weatherDescription(noon ?? first);
}

function astronomyOrHourlyPercent(value: Record<string, unknown>, key: string): number | undefined {
  const hourly = Array.isArray(value.hourly) ? value.hourly : [];
  const values = hourly.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const parsed = numberField(item, key);
    return parsed === undefined ? [] : [parsed];
  });

  if (values.length === 0) {
    return undefined;
  }

  return Math.max(...values);
}

function weatherDescription(value: Record<string, unknown> | undefined): string | undefined {
  if (!value || !Array.isArray(value.weatherDesc)) {
    return undefined;
  }

  const first = value.weatherDesc.find(isObject);
  return first ? stringField(first, "value") : undefined;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const raw = value[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  const raw = value[key];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function compactJsonObject(value: Record<string, unknown>): JsonObject {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null)
  ) as JsonObject;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
