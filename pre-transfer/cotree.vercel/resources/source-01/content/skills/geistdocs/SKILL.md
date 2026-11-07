---
name: "import.codex.vercel.geistdocs"
description: "Expert guidance for Geistdocs, Vercel's documentation template built with Next.js and Fumadocs — MDX authoring, configuration, AI chat, i18n, feedback, deployment. Use when creating documentation sites, configuring geistdocs, writing MDX content, or setting up docs infrastructure."
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

# Geistdocs — Vercel Documentation Template

You are an expert in Geistdocs, Vercel's production-ready documentation template built with Next.js 16 and Fumadocs. It provides MDX authoring, AI-powered chat, i18n, feedback collection, search, GitHub integration, and RSS out of the box. Currently in **beta**.

## Getting Started

### Prerequisites
- Node.js 18+, pnpm, GitHub account
- Familiarity with MDX, Next.js, React

### Create a New Project

```bash
npx @vercel/geistdocs init
```

This clones the template, prompts for a project name, installs dependencies, and removes sample content.

### Environment Setup

```bash
cp .env.example .env.local
pnpm dev
```

| Variable | Description |
|---|---|
| `AI_GATEWAY_API_KEY` | Powers AI chat; auto-configured on Vercel deployments |
| `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` | Production domain (format: `localhost:3000`, no protocol prefix); auto-set by Vercel |

## Project Structure

```
geistdocs.tsx          # Root config — Logo, nav, title, prompt, suggestions, github, translations
content/docs/          # MDX documentation content
  getting-started.mdx  # → /docs/getting-started
  my-page.mdx          # → /docs/my-page
  my-page.cn.mdx       # → /cn/docs/my-page (i18n)
.env.local             # Environment variables
```

Pages auto-route from the `content/docs/` directory: `content/docs/my-first-page.mdx` becomes `/docs/my-first-page`.

## Configuration (`geistdocs.tsx`)

The root config file exports these values:

```tsx
import { BookHeartIcon } from "lucide-react";

// Header branding
export const Logo = () => (
  <span className="flex items-center gap-2 font-semibold">
    <BookHeartIcon className="size-5" />
    My Docs
  </span>
);

// Navigation links
export const nav = [
  { label: "Blog", href: "/blog" },
  { label: "GitHub", href: "https://github.com/org/repo" },
];

// Site title (used in RSS, metadata)
export const title = "My Documentation";

// AI assistant system prompt
export const prompt = "You are a helpful assistant for My Product documentation.";

// AI suggested prompts
export const suggestions = [
  "How do I get started?",
  "What features are available?",
];

// Edit on GitHub integration
export const github = { owner: "username", repo: "repo-name" };

// Internationalization
export const translations = {
  en: { displayName: "English" },
  cn: { displayName: "中文", search: "搜尋文檔" },
};
```

## MDX Syntax & Frontmatter

Every MDX file requires frontmatter:

```mdx
---
title: My Page Title
description: A brief description of this page
---

Your content here...
```

### Supported Syntax

- **Text**: Bold, italic, strikethrough, inline code
- **Headings**: H1–H6 with auto anchor links
- **Lists**: Ordered, unordered, nested, task lists (GFM)
- **Tables**: GFM tables
- **Links, Images, Blockquotes**: Standard markdown

### Code Blocks

Language specification with special attributes:

````mdx
```tsx title="app/page.tsx" lineNumbers
export default function Page() {
  return <h1>Hello</h1> // [!code highlight]
}
```
````

| Attribute | Effect |
|---|---|
| `title="filename"` | File path header |
| `lineNumbers` | Show line numbers |
| `[!code highlight]` | Highlight line |
| `[!code word:term]` | Highlight term |
| `[!code ++]` / `[!code --]` | Diff additions/deletions |
| `[!code focus]` | Focus line |

### Mermaid Diagrams

````mdx
```mermaid
graph TD
  A[Start] --> B[Process]
  B --> C[End]
```
````

Supports flowcharts, sequence diagrams, and architecture diagrams.

## GeistdocsProvider

Root-level wrapper extending Fumadocs' `RootProvider`. Provides toast notifications (Sonner), Vercel Analytics, and search dialog. The AI sidebar auto-adds padding on desktop; mobile uses a drawer.

```tsx
import { GeistdocsProvider } from "./components/provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GeistdocsProvider>{children}</GeistdocsProvider>
      </body>
    </html>
  );
}
```

Toast API: `toast.success("msg")`, `toast.error("msg")` via Sonner.

## Features

### Edit on GitHub
Set `github` in config → auto-generates edit links in the ToC sidebar. No env vars or API keys needed.

### Feedback Widget
Interactive widget in ToC sidebar. Collects message, emotion emoji, name, email. Auto-creates structured GitHub Issues with labels.

### Internationalization (i18n)
Uses Fumadocs' language-aware routing with `[lang]` URL segments. Default language has no prefix; others get prefix (e.g., `/cn/docs/getting-started`).

File naming: `getting-started.mdx` (en), `getting-started.cn.mdx` (cn), `getting-started.fr.mdx` (fr).

Auto-translate: `pnpm translate [--pattern "path/**/*.mdx"] [--config file.tsx] [--url "api-url"]`

### RSS Feed
Auto-generated at `/rss.xml`. Requires `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` and `title` export. Customize via frontmatter `lastModified: 2025-11-12`.

### .md Extension (Raw Markdown)
Append `.md` or `.mdx` to any URL to get raw Markdown. Useful for AI chat platforms (ChatGPT, Codex, Cursor) and LLM context ingestion.

### llms.txt
Endpoint at `/llms.txt` returns ALL documentation as plain Markdown in a single response. Follows the llms.txt standard.

### Ask AI
AI chat assistant using `openai/gpt-4.1-mini` via Vercel AI Gateway. Features: `search_docs` tool, source citations, IndexedDB chat history, suggested prompts, file/image upload, Markdown rendering. Access via navbar button or `⌘I` / `Ctrl+I`.

### Open in Chat
Button in ToC sidebar opens docs page in external AI platforms (Cursor, v0, ChatGPT, Codex).

## Deployment

1. Push to GitHub
2. Import at vercel.com/new → select repo
3. Framework: Next.js (auto-detected), Build: `pnpm build`, Output: `.next`
4. Add environment variables (`AI_GATEWAY_API_KEY`, `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`)
5. Deploy

## Key Commands

| Command | Description |
|---|---|
| `npx @vercel/geistdocs init` | Create new project |
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm translate` | Auto-translate content |

## Official Documentation

- [Geistdocs Docs](https://preview.geistdocs.com/docs)
- [Getting Started](https://preview.geistdocs.com/docs/getting-started)
- [Configuration](https://preview.geistdocs.com/docs/configuration)
- [Syntax Reference](https://preview.geistdocs.com/docs/syntax)
- [GitHub Repository](https://github.com/vercel/geistdocs)
