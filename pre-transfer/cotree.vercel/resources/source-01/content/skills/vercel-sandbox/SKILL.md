---
name: "import.codex.vercel.vercel-sandbox"
description: "Vercel Sandbox guidance — ephemeral Firecracker microVMs for running untrusted code safely. Supports AI agents, code generation, and experimentation. Use when executing user-generated or AI-generated code in isolation."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Browser Automation with Vercel Sandbox

Run agent-browser + headless Chrome inside ephemeral Vercel Sandbox microVMs. A Linux VM spins up on demand, executes browser commands, and shuts down. Works with any Vercel-deployed framework (Next.js, SvelteKit, Nuxt, Remix, Astro, etc.).

## Dependencies

```bash
pnpm add @vercel/sandbox
```

The sandbox VM needs system dependencies for Chromium plus agent-browser itself. Use sandbox snapshots (below) to pre-install everything for sub-second startup.

## Core Pattern

```ts
import { Sandbox } from "@vercel/sandbox";

// System libraries required by Chromium on the sandbox VM (Amazon Linux / dnf)
const CHROMIUM_SYSTEM_DEPS = [
  "nss", "nspr", "libxkbcommon", "atk", "at-spi2-atk", "at-spi2-core",
  "libXcomposite", "libXdamage", "libXrandr", "libXfixes", "libXcursor",
  "libXi", "libXtst", "libXScrnSaver", "libXext", "mesa-libgbm", "libdrm",
  "mesa-libGL", "mesa-libEGL", "cups-libs", "alsa-lib", "pango", "cairo",
  "gtk3", "dbus-libs",
];

function getSandboxCredentials() {
  if (
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
  ) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }
  return {};
}

async function withBrowser<T>(
  fn: (sandbox: InstanceType<typeof Sandbox>) => Promise<T>,
): Promise<T> {
  const snapshotId = process.env.AGENT_BROWSER_SNAPSHOT_ID;
  const credentials = getSandboxCredentials();

  const sandbox = snapshotId
    ? await Sandbox.create({
        ...credentials,
        source: { type: "snapshot", snapshotId },
        timeout: 120_000,
      })
    : await Sandbox.create({ ...credentials, runtime: "node24", timeout: 120_000 });

  if (!snapshotId) {
    await sandbox.runCommand("sh", [
      "-c",
      `sudo dnf clean all 2>&1 && sudo dnf install -y --skip-broken ${CHROMIUM_SYSTEM_DEPS.join(" ")} 2>&1 && sudo ldconfig 2>&1`,
    ]);
    await sandbox.runCommand("npm", ["install", "-g", "agent-browser"]);
    await sandbox.runCommand("npx", ["agent-browser", "install"]);
  }

  try {
    return await fn(sandbox);
  } finally {
    await sandbox.stop();
  }
}
```

## Screenshot

The `screenshot --json` command saves to a file and returns the path. Read the file back as base64:

```ts
export async function screenshotUrl(url: string) {
  return withBrowser(async (sandbox) => {
    await sandbox.runCommand("agent-browser", ["open", url]);

    const titleResult = await sandbox.runCommand("agent-browser", [
      "get", "title", "--json",
    ]);
    const title = JSON.parse(await titleResult.stdout())?.data?.title || url;

    const ssResult = await sandbox.runCommand("agent-browser", [
      "screenshot", "--json",
    ]);
    const ssPath = JSON.parse(await ssResult.stdout())?.data?.path;
    const b64Result = await sandbox.runCommand("base64", ["-w", "0", ssPath]);
    const screenshot = (await b64Result.stdout()).trim();

    await sandbox.runCommand("agent-browser", ["close"]);

    return { title, screenshot };
  });
}
```

## Accessibility Snapshot

```ts
export async function snapshotUrl(url: string) {
  return withBrowser(async (sandbox) => {
    await sandbox.runCommand("agent-browser", ["open", url]);

    const titleResult = await sandbox.runCommand("agent-browser", [
      "get", "title", "--json",
    ]);
    const title = JSON.parse(await titleResult.stdout())?.data?.title || url;

    const snapResult = await sandbox.runCommand("agent-browser", [
      "snapshot", "-i", "-c",
    ]);
    const snapshot = await snapResult.stdout();

    await sandbox.runCommand("agent-browser", ["close"]);

    return { title, snapshot };
  });
}
```

## Multi-Step Workflows

The sandbox persists between commands, so you can run full automation sequences:

```ts
export async function fillAndSubmitForm(url: string, data: Record<string, string>) {
  return withBrowser(async (sandbox) => {
    await sandbox.runCommand("agent-browser", ["open", url]);

    const snapResult = await sandbox.runCommand("agent-browser", [
      "snapshot", "-i",
    ]);
    const snapshot = await snapResult.stdout();
    // Parse snapshot to find element refs...

    for (const [ref, value] of Object.entries(data)) {
      await sandbox.runCommand("agent-browser", ["fill", ref, value]);
    }

    await sandbox.runCommand("agent-browser", ["click", "@e5"]);
    await sandbox.runCommand("agent-browser", ["wait", "--load", "networkidle"]);

    const ssResult = await sandbox.runCommand("agent-browser", [
      "screenshot", "--json",
    ]);
    const ssPath = JSON.parse(await ssResult.stdout())?.data?.path;
    const b64Result = await sandbox.runCommand("base64", ["-w", "0", ssPath]);
    const screenshot = (await b64Result.stdout()).trim();

    await sandbox.runCommand("agent-browser", ["close"]);

    return { screenshot };
  });
}
```

## Sandbox Snapshots (Fast Startup)

A **sandbox snapshot** is a saved VM image of a Vercel Sandbox with system dependencies + agent-browser + Chromium already installed. Think of it like a Docker image -- instead of installing dependencies from scratch every time, the sandbox boots from the pre-built image.

This is unrelated to agent-browser's *accessibility snapshot* feature (`agent-browser snapshot`), which dumps a page's accessibility tree. A sandbox snapshot is a Vercel infrastructure concept for fast VM startup.

Without a sandbox snapshot, each run installs system deps + agent-browser + Chromium (~30s). With one, startup is sub-second.

### Creating a sandbox snapshot

The snapshot must include system dependencies (via `dnf`), agent-browser, and Chromium:

```ts
import { Sandbox } from "@vercel/sandbox";

const CHROMIUM_SYSTEM_DEPS = [
  "nss", "nspr", "libxkbcommon", "atk", "at-spi2-atk", "at-spi2-core",
  "libXcomposite", "libXdamage", "libXrandr", "libXfixes", "libXcursor",
  "libXi", "libXtst", "libXScrnSaver", "libXext", "mesa-libgbm", "libdrm",
  "mesa-libGL", "mesa-libEGL", "cups-libs", "alsa-lib", "pango", "cairo",
  "gtk3", "dbus-libs",
];

async function createSnapshot(): Promise<string> {
  const sandbox = await Sandbox.create({
    runtime: "node24",
    timeout: 300_000,
  });

  await sandbox.runCommand("sh", [
    "-c",
    `sudo dnf clean all 2>&1 && sudo dnf install -y --skip-broken ${CHROMIUM_SYSTEM_DEPS.join(" ")} 2>&1 && sudo ldconfig 2>&1`,
  ]);
  await sandbox.runCommand("npm", ["install", "-g", "agent-browser"]);
  await sandbox.runCommand("npx", ["agent-browser", "install"]);

  const snapshot = await sandbox.snapshot();
  return snapshot.snapshotId;
}
```

Run this once, then set the environment variable:

```bash
AGENT_BROWSER_SNAPSHOT_ID=snap_xxxxxxxxxxxx
```

A helper script is available in the demo app:

```bash
npx tsx examples/environments/scripts/create-snapshot.ts
```

Recommended for any production deployment using the Sandbox pattern.

## Authentication

On Vercel deployments, the Sandbox SDK authenticates automatically via OIDC. For local development or explicit control, set:

```bash
VERCEL_TOKEN=<personal-access-token>
VERCEL_TEAM_ID=<team-id>
VERCEL_PROJECT_ID=<project-id>
```

These are spread into `Sandbox.create()` calls. When absent, the SDK falls back to `VERCEL_OIDC_TOKEN` (automatic on Vercel).

## Scheduled Workflows (Cron)

Combine with Vercel Cron Jobs for recurring browser tasks:

```ts
// app/api/cron/route.ts  (or equivalent in your framework)
export async function GET() {
  const result = await withBrowser(async (sandbox) => {
    await sandbox.runCommand("agent-browser", ["open", "https://example.com/pricing"]);
    const snap = await sandbox.runCommand("agent-browser", ["snapshot", "-i", "-c"]);
    await sandbox.runCommand("agent-browser", ["close"]);
    return await snap.stdout();
  });

  // Process results, send alerts, store data...
  return Response.json({ ok: true, snapshot: result });
}
```

```json
// vercel.json
{ "crons": [{ "path": "/api/cron", "schedule": "0 9 * * *" }] }
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AGENT_BROWSER_SNAPSHOT_ID` | No (but recommended) | Pre-built sandbox snapshot ID for sub-second startup (see above) |
| `VERCEL_TOKEN` | No | Vercel personal access token (for local dev; OIDC is automatic on Vercel) |
| `VERCEL_TEAM_ID` | No | Vercel team ID (for local dev) |
| `VERCEL_PROJECT_ID` | No | Vercel project ID (for local dev) |

## Framework Examples

The pattern works identically across frameworks. The only difference is where you put the server-side code:

| Framework | Server code location |
|---|---|
| Next.js | Server actions, API routes, route handlers |
| SvelteKit | `+page.server.ts`, `+server.ts` |
| Nuxt | `server/api/`, `server/routes/` |
| Remix | `loader`, `action` functions |
| Astro | `.astro` frontmatter, API routes |

## Example

See `examples/environments/` in the agent-browser repo for a working app with the Vercel Sandbox pattern, including a sandbox snapshot creation script, streaming progress UI, and rate limiting.
