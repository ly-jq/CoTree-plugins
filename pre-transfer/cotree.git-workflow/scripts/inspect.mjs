import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function inspectRepository(workspace, base) {
  const cwd = path.resolve(workspace);
  const run = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const root = run("rev-parse", "--show-toplevel").trim();
  let head = null;
  try { head = run("rev-parse", "--verify", "HEAD").trim(); } catch { /* Unborn repository. */ }
  if (base && base.startsWith("-")) throw new Error("Base must be a Git ref, not an option");
  const mergeBase = base ? run("merge-base", "HEAD", run("rev-parse", "--verify", "--end-of-options", base + "^{commit}").trim()).trim() : null;
  return { root, head, mergeBase, statusPorcelain: run("status", "--porcelain=v1", "-z").split("\0").filter(Boolean),
    staged: run("diff", "--cached", "--stat"), unstaged: run("diff", "--stat"),
    branchDiff: mergeBase ? run("diff", "--stat", mergeBase, "HEAD", "--") : null,
    branches: run("for-each-ref", "--format=%(refname:short)%00%(upstream:short)%00%(upstream:track)%00%(objectname)", "refs/heads"),
    worktrees: run("worktree", "list", "--porcelain"), recent: head ? run("log", "-8", "--format=%h %s") : "" };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--workspace", "--base"].includes(args[i]) || !args[i + 1]) throw new Error("Usage: inspect.mjs --workspace <path> [--base <ref>]");
    options[args[i]] = args[i + 1];
  }
  console.log(JSON.stringify(inspectRepository(options["--workspace"] ?? process.cwd(), options["--base"]), null, 2));
}
