---
name: "import.codex.canva.canva-brand-check"
description: "Check a Canva design against a brand kit and report where it diverges — off-palette colors, non-brand fonts, logo misuse, and off-tone copy. Read-only; makes no changes. Use when the user asks \"is this on brand\", \"check this against our brand kit\", \"do a brand review\", \"does this match our brand guidelines\", or \"brand-check my design\"."
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

# Brand Checker

Compare a design against the user's brand kit and report, point by point, where it follows the brand and where it drifts. This is a specialised, brand-aware version of `canva-design-feedback`: same read-only "read the design, then critique" core, but the rubric is the brand kit. It **never edits** the design.

## The brand-kit data gap — read this first

`Canva:list-brand-kits` is documented to return brand kit **IDs, names, and thumbnails**. It may NOT return the machine-readable palette (hex values) and font families. Your approach depends on what you actually get back:

- **If the kit exposes colors/fonts** → use those exact hex codes and font names as the rubric (precise check).
- **If it only exposes a thumbnail/name** → you cannot do an exact hex/font match. Fall back to a **visual** comparison against the kit thumbnail, and ASK the user to paste their brand colors (hex) and fonts so you can check precisely. Be explicit that, without those, the color/font findings are approximate.

Never invent brand colors or fonts. If you don't have the real values, say so.

## Reading the design's actual colors and fonts

`Canva:get-design-content` returns text only — not colors or fonts.

- A **read-only** editing transaction (`Canva:start-editing-transaction` → inspect → `Canva:cancel-editing-transaction`, always cancel) reliably gives element **text, positions, and sizes**.
- **Colors and fonts are NOT reliably exposed** by the transaction — tested: it often returns only text + position + dimension, with no color/font attributes. So the **thumbnail is your primary evidence** for color and typography. Use any style data the payload happens to include, but never assert a design's hex or font as fact unless it was actually in the payload.

Because both the brand kit (see the gap above) AND the design itself frequently lack machine-readable colors/fonts, brand-check is often a **visual** comparison (design thumbnail vs. brand-kit thumbnail) plus the user-supplied palette/fonts. Use `Canva:get-design-thumbnail` for logo placement and overall visual tone.

## Workflow

### Step 1: Resolve the design
Short link → `Canva:resolve-shortlink`; full URL → extract ID; raw `D...` ID → use directly; otherwise ask.

### Step 2: Get the brand kit
- `Canva:list-brand-kits`. If several, ask which one (or infer from team/context).
- Capture whatever the kit exposes (name, thumbnail, and colors/fonts if present).
- Apply the data-gap handling above. If scopes are missing (e.g. "Missing scopes: [brandkit:read]"), tell the user to disconnect and reconnect the Canva connector to refresh the token.

### Step 3: Read the design
- `Canva:get-design-thumbnail` for visual/logo/tone.
- Read-only transaction (start → inspect → cancel) for the actual colors and fonts in use.

### Step 4: Compare against the brand
Check each dimension and mark **On brand / Off brand / Can't verify**:

- **Color** — are fills/text/accents within the brand palette? Flag off-palette hexes (and the nearest brand color).
- **Typography** — do fonts match brand fonts? Flag non-brand families and inconsistent sizing/weight usage.
- **Logo** — present where expected, correct version, not stretched/recolored/crowded (visual check from thumbnail).
- **Tone & copy** — does the wording match the brand voice the user describes?
- **Consistency** — is brand application consistent across all pages?

Use **Can't verify** honestly whenever the kit didn't expose the data and the user hasn't supplied it.

### Step 5: Report
```
## Brand check — "<design title>" vs "<brand kit name>"

Overall: ⚠️ Mostly on brand, 3 issues

### Off brand
- [Color] Page 2 heading is #1A73E8 — not in palette. Nearest brand color: #0B5CD7.
- [Font] Page 4 body uses Arial; brand body font is Inter.

### Can't verify (need input)
- Brand kit didn't expose hex values. Paste your palette + fonts for an exact check,
  or confirm the colors above against your guidelines.

### On brand
- Logo placement and cover treatment match the kit.
```

### Step 6: Offer to fix
Offer to correct the API-fixable issues via **`canva-edit-design`** — note that the API can change **text color** and font **size/weight/style**, but CANNOT change font **family** or background colors (those are manual in Canva; see `canva-edit-design`).

## Rules
- Read-only: always `cancel-editing-transaction` after inspecting. Never commit.
- Never fabricate brand values — use the kit's real data or what the user provides, otherwise mark **Can't verify**.
- Always name the specific page/element and the offending value vs. the brand value.
- Distinguish hard violations (wrong logo, off-palette color) from soft ones (slightly inconsistent spacing).
