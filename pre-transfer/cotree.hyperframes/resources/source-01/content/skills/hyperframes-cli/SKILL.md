---
name: "import.codex.hyperframes.hyperframes-cli"
description: "HyperFrames CLI tool — hyperframes init, lint, inspect, preview, render, transcribe, tts, doctor, browser, info, upgrade, compositions, docs, benchmark. Use when scaffolding a project, linting, validating, inspecting visual layout in compositions, previewing in the studio, rendering to video, transcribing audio, generating TTS, or troubleshooting the HyperFrames environment."
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

# HyperFrames CLI

Everything runs through `npx hyperframes`. Requires Node.js >= 22 and FFmpeg.

## Workflow

1. **Scaffold** — `npx hyperframes init my-video`
2. **Write** — author HTML composition (see the `hyperframes` skill)
3. **Lint** — `npx hyperframes lint`
4. **Visual inspect** — `npx hyperframes inspect`
5. **Preview** — `npx hyperframes preview`
6. **Render** — `npx hyperframes render`

Lint and inspect before preview. `lint` catches missing `data-composition-id`, overlapping tracks, and unregistered timelines. `inspect` opens the rendered composition in headless Chrome, seeks through the timeline, and reports text spilling out of bubbles/containers or off the canvas.

## Scaffolding

```bash
npx hyperframes init my-video                        # interactive wizard
npx hyperframes init my-video --example warm-grain   # pick an example
npx hyperframes init my-video --video clip.mp4        # with video file
npx hyperframes init my-video --audio track.mp3       # with audio file
npx hyperframes init my-video --non-interactive       # skip prompts (CI/agents)
```

Templates: `blank`, `warm-grain`, `play-mode`, `swiss-grid`, `vignelli`, `decision-tree`, `kinetic-type`, `product-promo`, `nyt-graph`.

`init` creates the right file structure, copies media, transcribes audio with Whisper, and installs AI coding skills. Use it instead of creating files by hand.

## Linting

```bash
npx hyperframes lint                  # current directory
npx hyperframes lint ./my-project     # specific project
npx hyperframes lint --verbose        # info-level findings
npx hyperframes lint --json           # machine-readable
```

Lints `index.html` and all files in `compositions/`. Reports errors (must fix), warnings (should fix), and info (with `--verbose`).

## Visual Inspect

```bash
npx hyperframes inspect                 # inspect rendered layout over the timeline
npx hyperframes inspect ./my-project    # specific project
npx hyperframes inspect --json          # agent-readable findings
npx hyperframes inspect --samples 15    # denser timeline sweep
npx hyperframes inspect --at 1.5,4,7.25 # explicit hero-frame timestamps
```

Use this after `lint` and `validate`, especially for compositions with speech bubbles, cards, captions, or tight typography. It reports:

- Text extending outside the nearest visual container or bubble
- Text clipped by its own fixed-width/fixed-height box
- Text extending outside the composition canvas
- Children escaping clipping containers

Errors should be fixed before rendering. Warnings are surfaced for agent review; add `--strict` to fail on warnings too. Repeated static issues are collapsed by default so JSON output stays compact for LLM context windows. If overflow is intentional for an entrance/exit animation, mark the element or ancestor with `data-layout-allow-overflow`. If a decorative element should never be audited, mark it with `data-layout-ignore`.

`npx hyperframes layout` remains available as a compatibility alias for the same visual inspection pass.

## Previewing

```bash
npx hyperframes preview                   # serve current directory
npx hyperframes preview --port 4567       # custom port (default 3002)
```

Hot-reloads on file changes. Opens the studio in your browser automatically.

When handing a project back to the user, use the Studio project URL, not the
source `index.html` path:

```text
http://localhost:<port>/#project/<project-name>
```

Use the actual port from the preview output and the project directory name. For
example, after `npx hyperframes preview --port 3017` in `codex-openai-video`,
report `http://localhost:3017/#project/codex-openai-video`.

Treat `index.html` as source-code context only. It is fine to link it as an
implementation file, but do not label it as the project or preview surface.

## Rendering

```bash
npx hyperframes render                                # standard MP4
npx hyperframes render --output final.mp4             # named output
npx hyperframes render --quality draft                # fast iteration
npx hyperframes render --fps 60 --quality high        # final delivery
npx hyperframes render --format webm                  # transparent WebM
npx hyperframes render --docker                       # byte-identical
```

| Flag           | Options               | Default                    | Notes                       |
| -------------- | --------------------- | -------------------------- | --------------------------- |
| `--output`     | path                  | renders/name_timestamp.mp4 | Output path                 |
| `--fps`        | 24, 30, 60            | 30                         | 60fps doubles render time   |
| `--quality`    | draft, standard, high | standard                   | draft for iterating         |
| `--format`     | mp4, webm             | mp4                        | WebM supports transparency  |
| `--workers`    | 1-8 or auto           | auto                       | Each spawns Chrome          |
| `--docker`     | flag                  | off                        | Reproducible output         |
| `--gpu`        | flag                  | off                        | GPU-accelerated encoding    |
| `--strict`     | flag                  | off                        | Fail on lint errors         |
| `--strict-all` | flag                  | off                        | Fail on errors AND warnings |

**Quality guidance:** `draft` while iterating, `standard` for review, `high` for final delivery.

## Transcription

```bash
npx hyperframes transcribe audio.mp3
npx hyperframes transcribe video.mp4 --model medium.en --language en
npx hyperframes transcribe subtitles.srt   # import existing
npx hyperframes transcribe subtitles.vtt
npx hyperframes transcribe openai-response.json
```

## Text-to-Speech

```bash
npx hyperframes tts "Text here" --voice af_nova --output narration.wav
npx hyperframes tts script.txt --voice bf_emma
npx hyperframes tts --list  # show all voices
```

## Troubleshooting

```bash
npx hyperframes doctor       # check environment (Chrome, FFmpeg, Node, memory)
npx hyperframes browser      # manage bundled Chrome
npx hyperframes info         # version and environment details
npx hyperframes upgrade      # check for updates
```

Run `doctor` first if rendering fails. Common issues: missing FFmpeg, missing Chrome, low memory.

## Other

```bash
npx hyperframes compositions   # list compositions in project
npx hyperframes docs           # open documentation
npx hyperframes benchmark .    # benchmark render performance
```
