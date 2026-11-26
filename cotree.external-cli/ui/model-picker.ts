/// <reference lib="dom" />
import type {
  CliEngine,
  CliEngineModelCatalog,
  CliEnginePreference,
  CliModelOption
} from "../src/shared.js";

export const CUSTOM_MODEL_SENTINEL = "__custom__";

export type EngineInspectEntry = {
  available: boolean;
  command: string;
  source?: string;
  error?: string;
  modelCatalog?: CliEngineModelCatalog;
  preference?: CliEnginePreference;
};

export type EnginesInspectMap = Partial<Record<CliEngine, EngineInspectEntry>> & Record<string, EngineInspectEntry | undefined>;

const EFFORT_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Max",
  ultra: "Ultra"
};

export function formatEffortLabel(effort: string): string {
  return EFFORT_LABELS[effort] ?? effort;
}

export function formatModelBadge(model?: string, effort?: string): string {
  if (!model && !effort) return "";
  if (model && effort) return `${model} · ${effort}`;
  return model || `effort:${effort}`;
}

export function formatCatalogHint(catalog?: CliEngineModelCatalog): string {
  if (!catalog) return "等待探测模型目录…";
  if (catalog.source === "unavailable") return catalog.note ?? "该 CLI 未安装";
  if (catalog.source === "live_rpc") {
    return `实时 RPC · ${catalog.models.length} 个可用模型`;
  }
  if (catalog.source === "live_cli") {
    return `实时探测 · ${catalog.models.length} 个可用模型`;
  }
  if (catalog.source === "live_acp") {
    return `ACP 实时协议 · ${catalog.models.length} 个可用模型`;
  }
  return catalog.models.length > 0
    ? `预设目录 (${catalog.models.length}) · 支持自定义模型 ID`
    : (catalog.note ?? "留空使用默认模型，或手填自定义模型 ID");
}

function findModelOption(catalog: CliEngineModelCatalog | undefined, modelId: string): CliModelOption | undefined {
  if (!catalog || !modelId) return undefined;
  return catalog.models.find((m) => m.id === modelId);
}

export function populateModelSelect(
  selectEl: HTMLSelectElement,
  customInputEl: HTMLInputElement,
  catalog: CliEngineModelCatalog | undefined,
  options: {
    selectedModel?: string;
    defaultLabel?: string;
  } = {}
): void {
  const desired = (options.selectedModel ?? "").trim();
  selectEl.replaceChildren();

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  const defaultHint = catalog?.defaultModel ? ` (${catalog.defaultModel})` : "";
  defaultOpt.textContent = options.defaultLabel ?? `默认模型${defaultHint}`;
  selectEl.append(defaultOpt);

  const models = catalog?.models ?? [];
  const grouped = new Map<string, CliModelOption[]>();
  for (const m of models) {
    const key = m.group || "可用模型";
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  let matchedInCatalog = desired === "";
  for (const [groupName, items] of grouped.entries()) {
    const og = document.createElement("optgroup");
    og.label = groupName;
    for (const m of items) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.isDefault ? `${m.displayName} (默认)` : m.displayName;
      if (m.description) opt.title = m.description;
      if (m.id === desired) matchedInCatalog = true;
      og.append(opt);
    }
    selectEl.append(og);
  }

  if (desired && !matchedInCatalog) {
    const og = document.createElement("optgroup");
    og.label = "当前 / 自定义模型";
    const opt = document.createElement("option");
    opt.value = desired;
    opt.textContent = desired;
    og.append(opt);
    selectEl.append(og);
    matchedInCatalog = true;
  }

  const customOpt = document.createElement("option");
  customOpt.value = CUSTOM_MODEL_SENTINEL;
  customOpt.textContent = "自定义模型 ID…";
  selectEl.append(customOpt);

  if (matchedInCatalog) {
    selectEl.value = desired;
    customInputEl.hidden = true;
    customInputEl.value = "";
  } else {
    selectEl.value = CUSTOM_MODEL_SENTINEL;
    customInputEl.hidden = false;
    customInputEl.value = desired;
  }
}

export function resolveSelectedModel(selectEl: HTMLSelectElement, customInputEl: HTMLInputElement): string | undefined {
  if (selectEl.value === CUSTOM_MODEL_SENTINEL) {
    const trimmed = customInputEl.value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  const value = selectEl.value.trim();
  return value.length > 0 ? value : undefined;
}

export function populateEffortSelect(
  selectEl: HTMLSelectElement,
  wrapEl: HTMLElement,
  catalog: CliEngineModelCatalog | undefined,
  selectedModel: string | undefined,
  selectedEffort: string | undefined
): void {
  const modelMeta = selectedModel ? findModelOption(catalog, selectedModel) : undefined;
  const efforts = modelMeta?.supportedReasoningEfforts ?? catalog?.supportedReasoningEfforts ?? [];
  const supported = Boolean(catalog?.supportsReasoningEffort && efforts.length > 0);
  wrapEl.hidden = !supported;
  selectEl.replaceChildren();

  if (!supported) return;

  const defOpt = document.createElement("option");
  defOpt.value = "";
  defOpt.textContent = modelMeta?.defaultReasoningEffort
    ? `默认 (${formatEffortLabel(modelMeta.defaultReasoningEffort)})`
    : "默认深度";
  selectEl.append(defOpt);

  for (const level of efforts) {
    const opt = document.createElement("option");
    opt.value = level;
    opt.textContent = formatEffortLabel(level);
    selectEl.append(opt);
  }

  const desired = (selectedEffort ?? "").trim();
  if (desired && efforts.includes(desired)) {
    selectEl.value = desired;
  } else {
    selectEl.value = "";
  }
}

export function syncModelCustomInputVisibility(selectEl: HTMLSelectElement, customInputEl: HTMLInputElement): void {
  const isCustom = selectEl.value === CUSTOM_MODEL_SENTINEL;
  customInputEl.hidden = !isCustom;
  if (isCustom) {
    customInputEl.focus();
  }
}
