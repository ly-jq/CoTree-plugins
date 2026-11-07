---
name: "import.codex.vercel.ai-generation-persistence"
description: "AI generation persistence patterns — unique IDs, addressable URLs, database storage, and cost tracking for every LLM generation"
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

# AI Generation Persistence

**AI generations are expensive, non-reproducible assets. Never discard them.**

Every call to an LLM costs real money and produces unique output that cannot be exactly reproduced. Treat generations like database records — assign an ID, persist immediately, and make them retrievable.

## Core Rules

1. **Generate an ID before the LLM call** — use `nanoid()` or `createId()` from `@paralleldrive/cuid2`
2. **Persist every generation** — text and metadata to database, images and files to Vercel Blob
3. **Make every generation addressable** — URL pattern: `/chat/[id]`, `/generate/[id]`, `/image/[id]`
4. **Track metadata** — model name, token usage, estimated cost, timestamp, user ID
5. **Never stream without saving** — if the user refreshes, the generation must survive

## Generate-Then-Redirect Pattern

The standard UX flow for AI features: create the resource first, then redirect to its page.

```ts
// app/api/chat/route.ts
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const { prompt, model } = await req.json();
  const id = nanoid();

  // Create the record BEFORE generation starts
  await db.insert(generations).values({
    id,
    prompt,
    model,
    status: "pending",
    createdAt: new Date(),
  });

  // Redirect to the generation page — it handles streaming
  redirect(`/chat/${id}`);
}
```

```tsx
// app/chat/[id]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, id),
  });
  if (!generation) notFound();

  // Render with streaming if still pending, or show saved result
  return <ChatView generation={generation} />;
}
```

This gives you: shareable URLs, back-button support, multi-tab sessions, and generation history for free.

## Persistence Schema

```ts
// lib/db/schema.ts
import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const generations = pgTable("generations", {
  id: text("id").primaryKey(),            // nanoid
  userId: text("user_id"),                // auth user
  model: text("model").notNull(),         // "openai/gpt-5.4"
  prompt: text("prompt"),                 // input text
  result: text("result"),                 // generated output
  imageUrls: jsonb("image_urls"),         // Blob URLs for generated images
  tokenUsage: jsonb("token_usage"),       // { promptTokens, completionTokens }
  estimatedCostCents: integer("estimated_cost_cents"),
  status: text("status").default("pending"), // pending | streaming | complete | error
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Storage Strategy

| Data Type | Storage | Why |
|-----------|---------|-----|
| Text, metadata, history | Neon Postgres via Drizzle | Queryable, relational, supports search |
| Generated images & files | Vercel Blob (`@vercel/blob`) | Permanent URLs, CDN-backed, no expiry |
| Prompt dedup cache | Upstash Redis | Fast lookup, TTL-based expiry |

## Image Persistence

Never serve generated images as ephemeral base64 or temporary URLs. Save to Blob immediately:

```ts
import { put } from "@vercel/blob";
import { generateText } from "ai";

const result = await generateText({ model, prompt });

// Save every generated image to permanent storage
const imageUrls: string[] = [];
for (const file of result.files ?? []) {
  if (file.mediaType?.startsWith("image/")) {
    const ext = file.mediaType.split("/")[1] || "png";
    const blob = await put(`generations/${generationId}.${ext}`, file.uint8Array, {
      access: "public",
      contentType: file.mediaType,
    });
    imageUrls.push(blob.url);
  }
}

// Update the generation record with permanent URLs
await db.update(generations)
  .set({ imageUrls, status: "complete" })
  .where(eq(generations.id, generationId));
```

## Cost Tracking

Extract usage from every generation and store it. This enables billing, budgeting, and abuse detection:

```ts
const result = await generateText({ model, prompt });

const usage = result.usage; // { promptTokens, completionTokens, totalTokens }
const estimatedCostCents = estimateCost(model, usage);

await db.update(generations).set({
  result: result.text,
  tokenUsage: usage,
  estimatedCostCents,
  status: "complete",
}).where(eq(generations.id, generationId));
```

## Prompt Dedup / Caching

Avoid paying for identical generations. Cache by content hash:

```ts
import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

const redis = Redis.fromEnv();

function hashPrompt(model: string, prompt: string): string {
  return createHash("sha256").update(`${model}:${prompt}`).digest("hex");
}

// Check cache before generating
const cacheKey = `gen:${hashPrompt(model, prompt)}`;
const cached = await redis.get<string>(cacheKey);
if (cached) return cached; // Return cached generation ID

// After generation, cache the result
await redis.set(cacheKey, generationId, { ex: 3600 }); // 1hr TTL
```

## Anti-Patterns

- **Streaming to client without saving** — generation lost on page refresh. Always write to DB as tokens arrive or on completion.
- **Routes without `[id]` segments** — `/api/chat` with no ID means generations aren't addressable. Use `/chat/[id]`.
- **Re-generating identical prompts** — check cache first. Same prompt + same model = same cost for no new value.
- **Ephemeral base64 images** — generated images served inline are lost when the component unmounts. Save to Vercel Blob.
- **Missing metadata** — always store model name, token counts, and timestamp. You need this for cost tracking and debugging.
- **Client-only state** — storing generations only in React state or localStorage. Use a database — generations must survive across devices and sessions.
