---
name: "import.codex.vercel.satori"
description: "Expert guidance for Satori — Vercel's library that converts HTML and CSS to SVG, commonly used to generate dynamic OG images for Next.js and other frameworks."
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

# Satori — HTML/CSS to SVG for OG Images

You are an expert in Satori and `@vercel/og` for generating dynamic Open Graph images.

## Overview

**Satori** converts JSX-like HTML and CSS into SVG. **`@vercel/og`** wraps Satori with an `ImageResponse` class that renders the SVG to PNG, designed to run in Vercel Edge Functions and other edge runtimes.

## Installation

```bash
# For Next.js projects (recommended — includes Satori + PNG rendering)
npm install @vercel/og

# Standalone Satori (SVG output only)
npm install satori
```

## Next.js App Router — OG Image Route (Recommended)

Next.js has built-in OG image support via the `ImageResponse` re-exported from `next/og`:

```tsx
// app/og/route.tsx  OR  app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'white',
          background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello, OG Image!
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

## Convention-Based OG Images (Next.js 13.3+)

Place an `opengraph-image.tsx` or `twitter-image.tsx` file in any route segment:

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Blog post image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#000',
          color: '#fff',
          fontSize: 48,
        }}
      >
        <div>{post.title}</div>
      </div>
    ),
    { ...size }
  )
}
```

Next.js auto-generates the `<meta property="og:image">` tag for these files.

## Standalone Satori (SVG Only)

```ts
import satori from 'satori'
import { readFileSync } from 'fs'

const svg = await satori(
  <div style={{ display: 'flex', color: 'black', fontSize: 40 }}>
    Hello from Satori
  </div>,
  {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: readFileSync('./fonts/Inter-Regular.ttf'),
        weight: 400,
        style: 'normal',
      },
    ],
  }
)
```

## CSS Support and Limitations

Satori uses a subset of CSS with Flexbox layout (Yoga engine):

**Supported:**
- `display: flex` (default — all elements are flex containers)
- Flexbox properties: `flexDirection`, `alignItems`, `justifyContent`, `flexWrap`, `gap`
- Box model: `width`, `height`, `padding`, `margin`, `border`, `borderRadius`
- Typography: `fontSize`, `fontWeight`, `fontFamily`, `lineHeight`, `letterSpacing`, `textAlign`
- Colors: `color`, `background`, `backgroundColor`, `opacity`
- Backgrounds: `backgroundImage` (linear/radial gradients), `backgroundClip`
- Shadows: `boxShadow`, `textShadow`
- Transforms: `transform` (basic transforms)
- Overflow: `overflow: hidden`
- Position: `absolute`, `relative`
- White space: `whiteSpace`, `wordBreak`, `textOverflow`

**Not supported:**
- `display: grid` — use nested flex containers instead
- CSS animations or transitions
- `position: fixed` or `sticky`
- Pseudo-elements (`::before`, `::after`)
- Media queries
- CSS variables

## Fonts

Fonts must be loaded explicitly — there are no default system fonts:

```tsx
// Load font in edge runtime
const font = fetch(new URL('./Inter-Bold.ttf', import.meta.url)).then(
  (res) => res.arrayBuffer()
)

export async function GET() {
  const fontData = await font

  return new ImageResponse(
    (<div style={{ fontFamily: 'Inter' }}>Hello</div>),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
    }
  )
}
```

For Google Fonts, fetch directly from the CDN or bundle the `.ttf` file.

## Dynamic Content from URL Parameters

```tsx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'Default Title'

  return new ImageResponse(
    (<div style={{ display: 'flex', fontSize: 60 }}>{title}</div>),
    { width: 1200, height: 630 }
  )
}
```

## Images in OG

Use `<img>` with absolute URLs:

```tsx
<img
  src="https://example.com/avatar.png"
  width={100}
  height={100}
  style={{ borderRadius: '50%' }}
/>
```

For local images, convert to base64 or use absolute deployment URLs.

## Key Patterns

1. **Use `next/og` in Next.js projects** — it re-exports `ImageResponse` with built-in optimizations
2. **Always set `runtime = 'edge'`** — Satori and `@vercel/og` are designed for edge runtimes
3. **Use `display: 'flex'` everywhere** — Satori defaults to flex layout, no block or grid support
4. **Load fonts explicitly** — no system fonts are available; bundle `.ttf`/`.woff` files or fetch from CDN
5. **Standard OG dimensions are 1200×630** — this is the most widely supported size
6. **Use convention files for automatic `<meta>` tags** — `opengraph-image.tsx` and `twitter-image.tsx`
7. **Inline styles only** — Satori does not support external CSS or CSS-in-JS libraries

## Official Resources

- [Satori GitHub](https://github.com/vercel/satori)
- [Vercel OG Image Generation](https://vercel.com/docs/functions/og-image-generation)
- [Next.js Metadata — OG Images](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Satori Playground](https://og-playground.vercel.app)
