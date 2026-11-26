import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import type { CliChangedFileStat } from "./shared.js";

const CHECKPOINT_REF_PREFIX = "refs/cotree-extcli/checkpoints";

async function runGit(
  processClient: PluginServiceContext["process"],
  resolvedCwd: string,
  args: string[],
  timeoutMs = 8_000
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const res = await processClient.execute("git", ["-C", resolvedCwd, ...args], {
      cwd: { kind: "workspace-directory", path: "." },
      env: { NO_COLOR: "1", CLICOLOR: "0" },
      timeoutMs,
      maxOutputBytes: 2 * 1024 * 1024
    });
    return {
      ok: res.exitCode === 0,
      stdout: res.stdout ?? "",
      stderr: res.stderr ?? ""
    };
  } catch {
    return { ok: false, stdout: "", stderr: "" };
  }
}

export async function isGitWorkspace(
  processClient: PluginServiceContext["process"],
  cwdRelative: string
): Promise<boolean> {
  const res = await runGit(processClient, cwdRelative, ["rev-parse", "--is-inside-work-tree"], 4_000);
  return res.ok && res.stdout.trim() === "true";
}

/**
 * Captures the current tracked workspace state (including staged & unstaged edits) into a
 * hidden Git ref (`refs/cotree-extcli/checkpoints/<id>`) without creating branch commits
 * or modifying the user's index/working tree.
 */
export async function captureHiddenGitCheckpoint(
  processClient: PluginServiceContext["process"],
  resolvedCwd: string,
  checkpointId: string
): Promise<string | undefined> {
  const safeId = checkpointId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
  if (!safeId) return undefined;
  const [stash, head] = await Promise.all([
    runGit(processClient, resolvedCwd, ["stash", "create", `cotree-checkpoint:${safeId}`], 6_000),
    runGit(processClient, resolvedCwd, ["rev-parse", "--verify", "HEAD"], 4_000)
  ]);
  const commitSha = (stash.ok && stash.stdout.trim()) || (head.ok && head.stdout.trim()) || "";
  if (!commitSha) return undefined;
  const refName = `${CHECKPOINT_REF_PREFIX}/${safeId}`;
  const updated = await runGit(processClient, resolvedCwd, ["update-ref", refName, commitSha], 4_000);
  return updated.ok ? refName : undefined;
}

export async function diffHiddenGitCheckpoints(
  processClient: PluginServiceContext["process"],
  cwdRelative: string,
  beforeRef: string,
  afterRef: string
): Promise<{ changedFiles: CliChangedFileStat[]; diffText: string }> {
  const [numstat, statusRes] = await Promise.all([
    runGit(processClient, cwdRelative, ["diff", "--numstat", beforeRef, afterRef], 6_000),
    runGit(processClient, cwdRelative, ["diff", "--name-status", beforeRef, afterRef], 6_000)
  ]);
  if (!numstat.ok) return { changedFiles: [], diffText: "" };

  const statusMap = new Map<string, CliChangedFileStat["status"]>();
  for (const line of statusRes.stdout.split(/\r?\n/)) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const code = parts[0]?.[0] ?? "M";
    const filePath = parts[parts.length - 1]!.trim();
    statusMap.set(
      filePath,
      code === "A" ? "added" : code === "D" ? "deleted" : code === "R" ? "renamed" : "modified"
    );
  }

  const changedFiles: CliChangedFileStat[] = [];
  for (const line of numstat.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const additions = parts[0] === "-" ? 0 : Number.parseInt(parts[0]!, 10) || 0;
    const deletions = parts[1] === "-" ? 0 : Number.parseInt(parts[1]!, 10) || 0;
    const filePath = parts[2]!.trim();
    if (!filePath) continue;
    changedFiles.push({
      path: filePath,
      additions,
      deletions,
      status: statusMap.get(filePath) ?? "modified"
    });
  }

  if (changedFiles.length === 0) return { changedFiles: [], diffText: "" };
  const patch = await runGit(processClient, cwdRelative, ["diff", beforeRef, afterRef], 8_000);
  return {
    changedFiles,
    diffText: patch.ok ? patch.stdout.slice(0, 128_000) : ""
  };
}

export async function restoreHiddenGitCheckpoint(
  processClient: PluginServiceContext["process"],
  cwdRelative: string,
  targetRef: string
): Promise<{ ok: boolean; error?: string }> {
  if (!targetRef.startsWith(`${CHECKPOINT_REF_PREFIX}/`)) {
    return { ok: false, error: "Invalid checkpoint reference." };
  }
  const verify = await runGit(processClient, cwdRelative, ["rev-parse", "--verify", targetRef], 4_000);
  if (!verify.ok) {
    return { ok: false, error: `Git checkpoint ref not found: ${targetRef}` };
  }
  const restored = await runGit(processClient, cwdRelative, ["checkout", targetRef, "--", "."], 10_000);
  if (!restored.ok) {
    return { ok: false, error: restored.stderr.trim() || "git checkout restore failed." };
  }
  return { ok: true };
}

export async function listWorkspaceGitFiles(
  processClient: PluginServiceContext["process"],
  cwdRelative: string,
  query = "",
  limit = 200
): Promise<string[]> {
  const res = await runGit(
    processClient,
    cwdRelative,
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    5_000
  );
  if (!res.ok) return [];
  const q = query.trim().toLowerCase();
  const out: string[] = [];
  for (const line of res.stdout.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean) continue;
    if (q && !clean.toLowerCase().includes(q)) continue;
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}
