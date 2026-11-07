---
name: "import.codex.vercel.cms"
description: "Headless CMS integration guidance — Sanity (native Vercel Marketplace), Contentful, DatoCMS, Storyblok, and Builder.io. Covers studio setup, content modeling, preview mode, revalidation webhooks, and Visual Editing. Use when building content-driven sites with a headless CMS on Vercel."
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

# Headless CMS Integration

You are an expert in integrating headless CMS platforms with Vercel-deployed applications — covering Sanity (native Vercel Marketplace), Contentful, DatoCMS, Storyblok, and Builder.io.

## Sanity (Native Vercel Marketplace Integration)

Sanity is the primary CMS integration on the Vercel Marketplace with first-class Visual Editing support.

### Install via Marketplace

```bash
# Install Sanity from Vercel Marketplace (auto-provisions env vars)
vercel integration add sanity
```

Auto-provisioned environment variables:
- `SANITY_PROJECT_ID` — Sanity project identifier
- `SANITY_DATASET` — dataset name (usually `production`)
- `SANITY_API_TOKEN` — read/write API token
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — client-side project ID
- `NEXT_PUBLIC_SANITY_DATASET` — client-side dataset name

### SDK Setup

```bash
# Install Sanity packages for Next.js
npm install next-sanity @sanity/client @sanity/image-url

# For embedded studio (optional)
npm install sanity @sanity/vision
```

### Client Configuration

```ts
// lib/sanity.ts
import { createClient } from "next-sanity";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2026-03-01",
  useCdn: true,
});
```

### Content Schema

```ts
// schemas/post.ts
import { defineType, defineField } from "sanity";

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "body", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "mainImage", type: "image", options: { hotspot: true } }),
    defineField({ name: "publishedAt", type: "datetime" }),
  ],
});
```

### Embedded Studio (App Router)

```ts
// app/studio/[[...tool]]/page.tsx
"use client";
import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
```

```ts
// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { post } from "./schemas/post";

export default defineConfig({
  name: "default",
  title: "My Studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  plugins: [structureTool(), visionTool()],
  schema: { types: [post] },
});
```

### Live Content with `defineLive()` (next-sanity v12)

Use `defineLive()` for automatic real-time content updates without manual revalidation. In next-sanity v11+, `defineLive` must be imported from the `next-sanity/live` subpath:

```ts
// lib/sanity.ts
import { createClient } from "next-sanity";
import { defineLive } from "next-sanity/live";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2026-03-01",
  useCdn: true,
});

export const { sanityFetch, SanityLive } = defineLive({
  client,
  // Required for draft content in Visual Editing — use a Viewer role token
  serverToken: process.env.SANITY_API_TOKEN,
  // Optional but recommended for faster live preview
  browserToken: process.env.SANITY_BROWSER_TOKEN,
});
```

```tsx
// app/page.tsx
import { sanityFetch, SanityLive } from "@/lib/sanity";

export default async function Page() {
  const { data: posts } = await sanityFetch({ query: `*[_type == "post"]` });
  return (
    <>
      {posts.map((post) => <div key={post._id}>{post.title}</div>)}
      <SanityLive />
    </>
  );
}
```

> **Breaking change in v12**: `defineLive({fetchOptions: {revalidate}})` has been removed. `defineLive({stega})` is deprecated.

### Visual Editing (Presentation Mode)

Sanity Visual Editing lets content editors click-to-edit content directly on the live site preview. Requires Sanity Studio v5+ (React 19.2) and `@sanity/visual-editing` v5+.

```bash
npm install @sanity/visual-editing
```

In next-sanity v11+, `VisualEditing` must be imported from the `next-sanity/visual-editing` subpath:

```ts
// app/layout.tsx
import { VisualEditing } from "next-sanity/visual-editing";
import { draftMode } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode();
  return (
    <html>
      <body>
        {children}
        {isEnabled && <VisualEditing />}
      </body>
    </html>
  );
}
```

### On-Demand Revalidation Webhook

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";

export async function POST(req: Request) {
  const { isValidSignature, body } = await parseBody<{
    _type: string;
    slug?: { current?: string };
  }>(req, process.env.SANITY_REVALIDATE_SECRET);

  if (!isValidSignature) {
    return Response.json({ message: "Invalid signature" }, { status: 401 });
  }

  if (body?._type) {
    revalidateTag(body._type);
  }

  return Response.json({ revalidated: true, now: Date.now() });
}
```

Configure the webhook in Sanity at **Settings → API → Webhooks** pointing to `https://your-site.vercel.app/api/revalidate`.

## Contentful

```bash
npm install contentful
```

```ts
// lib/contentful.ts
import { createClient } from "contentful";

export const contentful = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
});
```

### Fetching Entries

```ts
// app/page.tsx
import { contentful } from "@/lib/contentful";

export default async function Page() {
  const entries = await contentful.getEntries({ content_type: "blogPost" });
  return (
    <ul>
      {entries.items.map((entry) => (
        <li key={entry.sys.id}>{entry.fields.title as string}</li>
      ))}
    </ul>
  );
}
```

## Draft Mode (Preview)

All CMS integrations should use Next.js Draft Mode for preview:

```ts
// app/api/draft/route.ts
import { draftMode } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.DRAFT_SECRET) {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  const slug = searchParams.get("slug") ?? "/";
  return Response.redirect(new URL(slug, req.url));
}
```

## Environment Variables

| Variable | Scope | CMS | Description |
|----------|-------|-----|-------------|
| `SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_PROJECT_ID` | Server / Client | Sanity | Project identifier |
| `SANITY_DATASET` / `NEXT_PUBLIC_SANITY_DATASET` | Server / Client | Sanity | Dataset name |
| `SANITY_API_TOKEN` | Server | Sanity | Read/write token |
| `SANITY_REVALIDATE_SECRET` | Server | Sanity | Webhook secret for revalidation |
| `CONTENTFUL_SPACE_ID` | Server | Contentful | Space identifier |
| `CONTENTFUL_ACCESS_TOKEN` | Server | Contentful | Delivery API token |
| `CONTENTFUL_PREVIEW_TOKEN` | Server | Contentful | Preview API token |
| `DATOCMS_API_TOKEN` | Server | DatoCMS | Read-only API token |

## Cross-References

- **Marketplace install and env var provisioning** → `⤳ skill: marketplace`
- **On-demand revalidation and caching** → `⤳ skill: runtime-cache`
- **Draft mode and middleware patterns** → `⤳ skill: routing-middleware`
- **Environment variable management** → `⤳ skill: env-vars`
- **Image optimization** → `⤳ skill: nextjs`

## Official Documentation

- [Sanity + Vercel Marketplace](https://vercel.com/marketplace/sanity)
- [next-sanity Documentation](https://github.com/sanity-io/next-sanity) (v12)
- [next-sanity v11→v12 Migration](https://github.com/sanity-io/next-sanity/releases)
- [Sanity Visual Editing](https://www.sanity.io/docs/visual-editing)
- [Contentful JavaScript SDK](https://www.contentful.com/developers/docs/javascript/)
- [Next.js Draft Mode](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode)
