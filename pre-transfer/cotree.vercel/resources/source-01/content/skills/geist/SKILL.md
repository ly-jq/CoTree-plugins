---
name: "import.codex.vercel.geist"
description: "Expert guidance for Geist, Vercel's default typography system and font family for precise Next.js interfaces. Use when configuring Geist Sans, Geist Mono, or Geist Pixel, setting up font imports, or applying Vercel typography and aesthetic guidance."
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

# Geist — Vercel's Font Family

You are an expert in Geist (v1.7.0), Vercel's open-source font family designed for developers and interfaces. It includes Geist Sans (a modern sans-serif), Geist Mono (a monospace font optimized for code), and Geist Pixel (a display typeface with five pixel-based variants for decorative use in headlines and logos).

## Installation

```bash
npm install geist
```

## Usage with Next.js (next/font)

### App Router

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        {children}
      </body>
    </html>
  )
}
```

### With Tailwind CSS

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
    },
  },
}
export default config
```

Then use in components:

```tsx
<p className="font-sans">Geist Sans text</p>
<code className="font-mono">Geist Mono code</code>
```

### CSS Variables

Geist fonts expose CSS custom properties:

| Variable | Font |
|---|---|
| `--font-geist-sans` | Geist Sans |
| `--font-geist-mono` | Geist Mono |

Use them in CSS:

```css
body {
  font-family: var(--font-geist-sans);
}

code, pre {
  font-family: var(--font-geist-mono);
}
```

## Font Weights

Both Geist Sans and Geist Mono support these weights:

| Weight | Value |
|---|---|
| Thin | 100 |
| Extra Light | 200 |
| Light | 300 |
| Regular | 400 |
| Medium | 500 |
| Semi Bold | 600 |
| Bold | 700 |
| Extra Bold | 800 |
| Black | 900 |

## Typography Direction for Geist

Geist is not just a font import. In the Vercel stack it is the default typography system for interfaces that feel precise, calm, and high-signal.

### What good looks like

- Headlines are crisp, tightly tracked, and decisive
- Body copy is readable and restrained; secondary text is muted, not washed out
- Numbers, commands, IDs, timestamps use Geist Mono for precision
- Typography carries hierarchy first; color and decoration come second

### Default type recipes

```tsx
<h1 className="text-4xl font-medium tracking-[-0.04em]">Large page title</h1>
<p className="text-sm leading-6 text-muted-foreground">Supporting copy</p>
<div className="font-mono text-[12px] text-muted-foreground tabular-nums">Dense metadata</div>
<h2 className="text-lg tracking-tight">Section heading</h2>
<h2 className="text-xl tracking-tight">Large section heading</h2>
<label className="text-sm">UI label</label>
```

Avoid defaulting entire interfaces to `text-base`.

### Where to use each family

- Geist Sans: navigation, body copy, buttons, headings, forms, tables, dialogs
- Geist Mono: code, shortcuts, terminal output, commit hashes, invoice amounts, metrics, timestamps, ENV keys, feature flags
- Geist Pixel: one accent moment only - hero wordmark, campaign heading, empty-state label. Never body text or settings UI.

### Anti-patterns

- Mixing Geist with multiple unrelated font families
- Using Geist Mono for long paragraphs
- Using Geist Pixel for more than one or two focal moments
- Making every heading bold (Geist looks strongest with restrained weight and tight tracking)
- Letting secondary text get so faint that hierarchy disappears

## Subset Configuration

Optimize font loading by specifying subsets:

```tsx
import { GeistSans } from 'geist/font/sans'

// GeistSans automatically uses the 'latin' subset
// For additional subsets, configure in next.config.js
```

## Geist Pixel (Feb 6, 2026)

Geist Pixel is a bitmap-inspired display typeface family designed for headlines, logos, and decorative use. It ships five variants, each built on a different geometric primitive:

| Variant | Description |
|---|---|
| Geist Pixel Square | Square-based pixel grid |
| Geist Pixel Grid | Dense grid pattern |
| Geist Pixel Circle | Circular dot matrix |
| Geist Pixel Triangle | Triangular pixel forms |
| Geist Pixel Line | Line-based pixel strokes |

Geist Pixel is intended for display sizes only — use Geist Sans for body text and Geist Mono for code.

## Coding Ligatures (v1.7.0)

Coding ligatures are **no longer enabled by default**. They have been moved from contextual alternates to **Stylistic Set 11 (SS11)**. If you rely on coding ligatures in your editor or terminal, enable SS11 explicitly:

- **VS Code**: `"editor.fontLigatures": "'ss11'"`
- **CSS**: `font-feature-settings: 'ss11' 1;`

## Cyrillic Support (v1.7.0)

Geist 1.7.0 includes a redesigned Cyrillic script for all Geist Sans and Geist Mono styles.

## Key Points

1. **Optimized for Next.js** — works seamlessly with `next/font` for zero-layout-shift font loading
2. **Three families** — Geist Sans for UI text, Geist Mono for code, Geist Pixel for decorative display
3. **CSS variables** — `--font-geist-sans` and `--font-geist-mono` for flexible styling
4. **Variable font** — single file supports all weights (100–900)
5. **Self-hosted** — fonts are bundled with your app, no external requests
6. **Import paths** — use `geist/font/sans` and `geist/font/mono` (not `geist/font`)
7. **Coding ligatures** — opt-in via Stylistic Set 11 (no longer default)

## Official Resources

- [Geist Font GitHub](https://github.com/vercel/geist-font)
- [Geist Design System](https://vercel.com/geist)
