---
name: "import.codex.vercel.chat-sdk"
description: "Vercel Chat SDK expert guidance. Use when building multi-platform chat bots — Slack, Telegram, Microsoft Teams, Discord, Google Chat, GitHub, Linear — with a single codebase. Covers the Chat class, adapters, threads, messages, cards, modals, streaming, state management, and webhook setup."
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

# Chat SDK

Unified TypeScript SDK for building chat bots across Slack, Teams, Google Chat, Discord, Telegram, GitHub, Linear, and WhatsApp. Write bot logic once, deploy everywhere.

## Start with published sources

When Chat SDK is installed in a user project, inspect the published files that ship in `node_modules`:

```
node_modules/chat/docs/                    # bundled docs
node_modules/chat/dist/index.d.ts          # core API types
node_modules/chat/dist/jsx-runtime.d.ts    # JSX runtime types
node_modules/chat/docs/contributing/       # adapter-authoring docs
node_modules/chat/docs/guides/             # framework/platform guides
```

If one of the paths below does not exist, that package is not installed in the project yet.

Read these before writing code:
- `node_modules/chat/docs/getting-started.mdx` — install and setup
- `node_modules/chat/docs/usage.mdx` — `Chat` config and lifecycle
- `node_modules/chat/docs/handling-events.mdx` — event routing and handlers
- `node_modules/chat/docs/threads-messages-channels.mdx` — thread/channel/message model
- `node_modules/chat/docs/posting-messages.mdx` — post, edit, delete, schedule
- `node_modules/chat/docs/streaming.mdx` — AI SDK integration and streaming semantics
- `node_modules/chat/docs/cards.mdx` — JSX cards
- `node_modules/chat/docs/actions.mdx` — button/select interactions
- `node_modules/chat/docs/modals.mdx` — modal submit/close flows
- `node_modules/chat/docs/slash-commands.mdx` — slash command routing
- `node_modules/chat/docs/direct-messages.mdx` — DM behavior and `openDM()`
- `node_modules/chat/docs/files.mdx` — attachments/uploads
- `node_modules/chat/docs/state.mdx` — persistence, locking, dedupe
- `node_modules/chat/docs/adapters.mdx` — cross-platform feature matrix
- `node_modules/chat/docs/api/chat.mdx` — exact `Chat` API
- `node_modules/chat/docs/api/thread.mdx` — exact `Thread` API
- `node_modules/chat/docs/api/message.mdx` — exact `Message` API
- `node_modules/chat/docs/api/modals.mdx` — modal element and event details

For the specific adapter or state package you are using, inspect that installed package's `dist/index.d.ts` export surface in `node_modules`.

## Quick start

```typescript
import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";

const bot = new Chat({
  userName: "mybot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createRedisState(),
  dedupeTtlMs: 600_000,
});

bot.onNewMention(async (thread) => {
  await thread.subscribe();
  await thread.post("Hello! I'm listening to this thread.");
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});
```

## Core concepts

- **Chat** — main entry point; coordinates adapters, routing, locks, and state
- **Adapters** — platform-specific integrations for Slack, Teams, Google Chat, Discord, Telegram, GitHub, Linear, and WhatsApp
- **State adapters** — persistence for subscriptions, locks, dedupe, and thread state
- **Thread** — conversation context with `post()`, `stream()`, `subscribe()`, `setState()`, `startTyping()`
- **Message** — normalized content with `text`, `formatted`, attachments, author info, and platform `raw`
- **Channel** — container for threads and top-level posts

## Event handlers

| Handler | Trigger |
|---------|---------|
| `onNewMention` | Bot @-mentioned in an unsubscribed thread |
| `onDirectMessage` | New DM in an unsubscribed DM thread |
| `onSubscribedMessage` | Any message in a subscribed thread |
| `onNewMessage(regex)` | Regex match in an unsubscribed thread |
| `onReaction(emojis?)` | Emoji added or removed |
| `onAction(actionIds?)` | Button clicks and select/radio interactions |
| `onModalSubmit(callbackId?)` | Modal form submitted |
| `onModalClose(callbackId?)` | Modal dismissed/cancelled |
| `onSlashCommand(commands?)` | Slash command invocation |
| `onAssistantThreadStarted` | Slack assistant thread opened |
| `onAssistantContextChanged` | Slack assistant context changed |
| `onAppHomeOpened` | Slack App Home opened |
| `onMemberJoinedChannel` | Slack member joined channel event |

Read `node_modules/chat/docs/handling-events.mdx`, `node_modules/chat/docs/actions.mdx`, `node_modules/chat/docs/modals.mdx`, and `node_modules/chat/docs/slash-commands.mdx` before wiring handlers. `onDirectMessage` behavior is documented in `node_modules/chat/docs/direct-messages.mdx`.

## Streaming

Pass any `AsyncIterable<string>` to `thread.post()` or `thread.stream()`. For AI SDK, prefer `result.fullStream` over `result.textStream` when available so step boundaries are preserved.

```typescript
import { ToolLoopAgent } from "ai";

const agent = new ToolLoopAgent({ model: "anthropic/claude-4.5-sonnet" });

bot.onNewMention(async (thread, message) => {
  const result = await agent.stream({ prompt: message.text });
  await thread.post(result.fullStream);
});
```

Key details:
- `streamingUpdateIntervalMs` controls post+edit fallback cadence
- `fallbackStreamingPlaceholderText` defaults to `"..."`; set `null` to disable
- Structured `StreamChunk` support is Slack-only; other adapters ignore non-text chunks

## Cards and modals (JSX)

Set `jsxImportSource: "chat"` in `tsconfig.json`.

Card components:
- `Card`, `CardText`, `Section`, `Fields`, `Field`, `Button`, `CardLink`, `LinkButton`, `Actions`, `Select`, `SelectOption`, `RadioSelect`, `Table`, `Image`, `Divider`

Modal components:
- `Modal`, `TextInput`, `Select`, `SelectOption`, `RadioSelect`

```tsx
await thread.post(
  <Card title="Order #1234">
    <CardText>Your order has been received.</CardText>
    <Actions>
      <Button id="approve" style="primary">Approve</Button>
      <Button id="reject" style="danger">Reject</Button>
    </Actions>
  </Card>
);
```

## Adapter inventory

### Official platform adapters

| Platform | Package | Factory |
|---------|---------|---------|
| Slack | `@chat-adapter/slack` | `createSlackAdapter` |
| Microsoft Teams | `@chat-adapter/teams` | `createTeamsAdapter` |
| Google Chat | `@chat-adapter/gchat` | `createGoogleChatAdapter` |
| Discord | `@chat-adapter/discord` | `createDiscordAdapter` |
| GitHub | `@chat-adapter/github` | `createGitHubAdapter` |
| Linear | `@chat-adapter/linear` | `createLinearAdapter` |
| Telegram | `@chat-adapter/telegram` | `createTelegramAdapter` |
| WhatsApp Business Cloud | `@chat-adapter/whatsapp` | `createWhatsAppAdapter` |

### Official state adapters

| State backend | Package | Factory |
|--------------|---------|---------|
| Redis | `@chat-adapter/state-redis` | `createRedisState` |
| ioredis | `@chat-adapter/state-ioredis` | `createIoRedisState` |
| PostgreSQL | `@chat-adapter/state-pg` | `createPostgresState` |
| Memory | `@chat-adapter/state-memory` | `createMemoryState` |

### Community adapters

- `chat-state-cloudflare-do`
- `@beeper/chat-adapter-matrix`
- `chat-adapter-imessage`
- `@bitbasti/chat-adapter-webex`
- `@resend/chat-sdk-adapter`
- `chat-adapter-baileys`

### Coming-soon platform entries

- Instagram
- Signal
- X
- Messenger

## Building a custom adapter

Read these published docs first:
- `node_modules/chat/docs/contributing/building.mdx`
- `node_modules/chat/docs/contributing/testing.mdx`
- `node_modules/chat/docs/contributing/publishing.mdx`

Also inspect:
- `node_modules/chat/dist/index.d.ts` — `Adapter` and related interfaces
- `node_modules/@chat-adapter/shared/dist/index.d.ts` — shared errors and utilities
- Installed official adapter `dist/index.d.ts` files — reference implementations for config and APIs

A custom adapter needs request verification, webhook parsing, message/thread/channel operations, ID encoding/decoding, and a format converter. Use `BaseFormatConverter` from `chat` and shared utilities from `@chat-adapter/shared`.

## Webhook setup

Each registered adapter exposes `bot.webhooks.<name>`. Wire those directly to your HTTP framework routes. See `node_modules/chat/docs/guides/slack-nextjs.mdx` and `node_modules/chat/docs/guides/discord-nuxt.mdx` for framework-specific route patterns.
