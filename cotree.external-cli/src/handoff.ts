import {
  ENGINE_CAPABILITIES,
  stripAnsi,
  truncateText,
  type CliEngine,
  type CliTranscriptTurn
} from "./shared.js";

const DEFAULT_HANDOFF_MAX_BYTES = 48_000;

export type PortableHandoffBundle = {
  summaryText: string;
  codexInjectItems: Array<Record<string, unknown>>;
  includedTurns: number;
  omittedTurns: number;
};

type CandidateSlice = {
  turnIndex: number;
  role: "user" | "assistant";
  text: string;
  priority: number;
};

function summarizeTurnForHandoff(turn: CliTranscriptTurn): { userText: string; assistantText: string } {
  const userText = stripAnsi(turn.prompt || "").trim();
  const assistantParts: string[] = [];
  const toolOutcomes: string[] = [];
  for (const block of turn.blocks) {
    if (block.kind === "assistant" && block.text.trim()) {
      assistantParts.push(stripAnsi(block.text).trim());
    } else if (block.kind === "plan" && block.text.trim()) {
      assistantParts.push(`[Plan]\n${stripAnsi(block.text).trim()}`);
    } else if (block.kind === "command") {
      const exitCode = typeof block.meta?.exitCode === "number" ? ` (exit=${block.meta.exitCode})` : "";
      toolOutcomes.push(`- cmd: ${truncateText(stripAnsi(block.title), 140)}${exitCode}`);
    } else if (block.kind === "file_change") {
      toolOutcomes.push(`- diff: ${truncateText(stripAnsi(block.title), 140)} (${block.status})`);
    } else if (block.kind === "tool") {
      toolOutcomes.push(`- tool: ${truncateText(stripAnsi(block.title), 120)} (${block.status})`);
    } else if (block.kind === "image" && typeof block.meta?.savedPath === "string") {
      toolOutcomes.push(`- image: ${block.meta.savedPath}`);
    }
  }
  const combinedAssistant = [
    assistantParts.join("\n\n"),
    toolOutcomes.length > 0 ? `Execution outcomes:\n${toolOutcomes.slice(-12).join("\n")}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
  return { userText, assistantText: combinedAssistant };
}

/**
 * Deterministic budgeted cross-engine context handoff (inspired by t3code handoffBudget.ts):
 * - No extra LLM summarization round-trip.
 * - Prioritizes: original task prompt -> newest assistant reply -> newest user turn -> reverse chronological turns.
 * - Never truncates the user's incoming prompt (which is sent separately or appended after this bundle).
 */
export function buildPortableHandoff(input: {
  sourceEngine: CliEngine;
  sourceSessionId: string;
  targetEngine: CliEngine;
  turns: CliTranscriptTurn[];
  maxBytes?: number;
}): PortableHandoffBundle {
  const maxBytes = Math.max(4_096, Math.min(64_000, input.maxBytes ?? DEFAULT_HANDOFF_MAX_BYTES));
  const candidates: CandidateSlice[] = [];
  const totalTurns = input.turns.length;

  input.turns.forEach((turn, idx) => {
    const { userText, assistantText } = summarizeTurnForHandoff(turn);
    const isFirst = idx === 0;
    const isLast = idx === totalTurns - 1;
    if (userText) {
      candidates.push({
        turnIndex: turn.turnIndex,
        role: "user",
        text: truncateText(userText, 6_000),
        priority: isFirst ? 100 : isLast ? 95 : 50 + idx
      });
    }
    if (assistantText) {
      candidates.push({
        turnIndex: turn.turnIndex,
        role: "assistant",
        text: truncateText(assistantText, 8_000),
        priority: isLast ? 98 : 40 + idx
      });
    }
  });

  const ranked = [...candidates].sort((a, b) => b.priority - a.priority);
  const selected = new Set<CandidateSlice>();
  let usedBytes = 0;

  for (const slice of ranked) {
    const cost = Buffer.byteLength(slice.text, "utf8") + 64;
    if (usedBytes + cost <= maxBytes) {
      selected.add(slice);
      usedBytes += cost;
    }
  }

  const ordered = candidates.filter((c) => selected.has(c));
  const includedTurnIndices = new Set(ordered.map((c) => c.turnIndex));
  const omittedTurnIndices = input.turns
    .map((t) => t.turnIndex)
    .filter((idx) => !includedTurnIndices.has(idx));

  const header = [
    `[CoTree Cross-Engine Context Handoff]`,
    `Source: ${ENGINE_CAPABILITIES[input.sourceEngine].displayName} (session=${input.sourceSessionId}) -> Target: ${ENGINE_CAPABILITIES[input.targetEngine].displayName}`,
    `Included turns: ${includedTurnIndices.size}/${totalTurns}${omittedTurnIndices.length > 0 ? ` (omitted older turns: #${omittedTurnIndices.slice(0, 12).join(", #")})` : ""}`,
    ""
  ].join("\n");

  const bodyLines = ordered.map(
    (entry) => `[Turn #${entry.turnIndex} · ${entry.role === "user" ? "User" : ENGINE_CAPABILITIES[input.sourceEngine].displayName}]\n${entry.text}`
  );
  const summaryText = `${header}${bodyLines.join("\n\n---\n\n")}`;

  const codexInjectItems: Array<Record<string, unknown>> = ordered.map((entry) => ({
    type: "message",
    role: entry.role,
    content: [
      {
        type: entry.role === "user" ? "input_text" : "output_text",
        text: `[Handoff from ${ENGINE_CAPABILITIES[input.sourceEngine].displayName} Turn #${entry.turnIndex}]\n${entry.text}`
      }
    ]
  }));

  return {
    summaryText,
    codexInjectItems,
    includedTurns: includedTurnIndices.size,
    omittedTurns: omittedTurnIndices.length
  };
}
