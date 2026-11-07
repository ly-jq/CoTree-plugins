---
name: "import.codex.vercel.email"
description: "Email sending integration guidance — Resend (native Vercel Marketplace) with React Email templates. Covers API setup, transactional emails, domain verification, and template patterns. Use when sending emails from a Vercel-deployed application."
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

# Email Integration (Resend + React Email)

You are an expert in sending emails from Vercel-deployed applications — covering Resend (native Vercel Marketplace integration), React Email templates, domain verification, and transactional email patterns.

## Vercel Marketplace Setup (Recommended)

Resend is a native Vercel Marketplace integration with auto-provisioned API keys and unified billing.

### Install via Marketplace

```bash
# Install Resend from Vercel Marketplace (auto-provisions env vars)
vercel integration add resend
```

Auto-provisioned environment variables:
- `RESEND_API_KEY` — server-side API key for sending emails

### SDK Setup

```bash
# Install the Resend SDK
npm install resend

# Install React Email for building templates
npm install react-email @react-email/components
```

### Initialize the Client

Current Resend SDK version: **6.9.x** (actively maintained, weekly downloads ~1.6M).

```ts
// lib/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

## Sending Emails

### Basic API Route

```ts
// app/api/send/route.ts
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

export async function POST(req: Request) {
  const { to, subject, html } = await req.json();

  const { data, error } = await resend.emails.send({
    from: "Your App <hello@yourdomain.com>",
    to,
    subject,
    html,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ id: data?.id });
}
```

### Send with React Email Template

```ts
// app/api/send/route.ts
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import WelcomeEmail from "@/emails/welcome";

export async function POST(req: Request) {
  const { name, email } = await req.json();

  const { data, error } = await resend.emails.send({
    from: "Your App <hello@yourdomain.com>",
    to: email,
    subject: "Welcome!",
    react: WelcomeEmail({ name }),
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ id: data?.id });
}
```

## React Email Templates

### Template Structure

Organize templates in an `emails/` directory at the project root:

```
emails/
  welcome.tsx
  invoice.tsx
  reset-password.tsx
```

### Example Template

```tsx
// emails/welcome.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f9fc" }}>
        <Container style={{ padding: "40px 20px", maxWidth: "560px" }}>
          <Heading>Welcome, {name}!</Heading>
          <Text>
            Thanks for signing up. Get started by visiting your{" "}
            <Link href="https://yourdomain.com/dashboard">dashboard</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Preview Templates Locally

```bash
# Start the React Email dev server to preview templates
npx react-email dev
```

This opens a browser preview at `http://localhost:3000` where you can view and iterate on email templates with hot reload.

### Upload Templates to Resend (React Email 5.0)

```bash
# Upload templates directly from the CLI
npx react-email@latest resend setup
```

Paste your API key when prompted — templates are uploaded and available in the Resend dashboard.

### Dark Mode Support (React Email 5.x)

React Email 5.x (latest 5.2.9, `@react-email/components` 1.0.8) supports dark mode with a theming system tested across popular email clients. Now also supports **React 19.2** and **Next.js 16**. Use the `Tailwind` component with Tailwind CSS v4 for email styling:

```tsx
import { Tailwind } from "@react-email/components";

export default function MyEmail() {
  return (
    <Tailwind>
      <div className="bg-white dark:bg-gray-900 text-black dark:text-white">
        <h1>Hello</h1>
      </div>
    </Tailwind>
  );
}
```

**Upgrade note (v4 → v5)**: Replace all `renderAsync` with `render`. The Tailwind component now only supports Tailwind CSS v4.

## Domain Verification

To send from a custom domain (not `onboarding@resend.dev`), verify your domain in Resend:

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain
3. Add the DNS records (MX, SPF, DKIM) to your domain provider
4. Wait for verification (usually under 5 minutes)

Until your domain is verified, use `onboarding@resend.dev` as the `from` address for testing.

## Common Patterns

### Batch Sending

```ts
const { data, error } = await resend.batch.send([
  {
    from: "hello@yourdomain.com",
    to: "user1@example.com",
    subject: "Update",
    html: "<p>Content for user 1</p>",
  },
  {
    from: "hello@yourdomain.com",
    to: "user2@example.com",
    subject: "Update",
    html: "<p>Content for user 2</p>",
  },
]);
```

### Server Action

```ts
"use server";
import { resend } from "@/lib/resend";
import WelcomeEmail from "@/emails/welcome";

export async function sendWelcomeEmail(name: string, email: string) {
  const { error } = await resend.emails.send({
    from: "Your App <hello@yourdomain.com>",
    to: email,
    subject: "Welcome!",
    react: WelcomeEmail({ name }),
  });

  if (error) throw new Error("Failed to send email");
}
```

### Broadcast API (February 2026)

Send emails to audiences (mailing lists) managed in Resend:

```ts
// Send a broadcast to an audience
const { data, error } = await resend.broadcasts.send({
  audienceId: "aud_1234",
  from: "updates@yourdomain.com",
  subject: "Monthly Newsletter",
  react: NewsletterEmail({ month: "March" }),
});

// Create and manage broadcasts programmatically
const broadcast = await resend.broadcasts.create({
  audienceId: "aud_1234",
  from: "updates@yourdomain.com",
  subject: "Product Update",
  react: ProductUpdateEmail(),
});

// Schedule for later
await resend.broadcasts.send({
  broadcastId: broadcast.data?.id,
  scheduledAt: "2026-03-15T09:00:00Z",
});
```

### Idempotency Keys

Prevent duplicate sends on retries by passing an `Idempotency-Key` header:

```ts
const { data, error } = await resend.emails.send(
  {
    from: "hello@yourdomain.com",
    to: "user@example.com",
    subject: "Order Confirmation",
    react: OrderConfirmation({ orderId: "ord_123" }),
  },
  {
    headers: {
      "Idempotency-Key": `order-confirmation-ord_123`,
    },
  }
);
```

Resend deduplicates requests with the same idempotency key within a 24-hour window. Use deterministic keys derived from your business logic (e.g., `order-confirmation-${orderId}`).

### Webhook Management API

Create and manage webhooks programmatically instead of through the dashboard:

```ts
// Create a webhook endpoint
const { data } = await resend.webhooks.create({
  url: "https://yourdomain.com/api/webhook/resend",
  events: ["email.delivered", "email.bounced", "email.complained", "email.suppressed"],
});

// List all webhooks
const webhooks = await resend.webhooks.list();

// Delete a webhook
await resend.webhooks.remove(webhookId);
```

### Email Status: "suppressed"

Resend now tracks a `"suppressed"` delivery status for recipients on suppression lists (previous hard bounces or spam complaints). Check for this in webhook events alongside delivered/bounced/complained.

### Webhook for Delivery Events

```ts
// app/api/webhook/resend/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const event = await req.json();

  switch (event.type) {
    case "email.delivered":
      // Track successful delivery
      break;
    case "email.bounced":
      // Handle bounce — remove from mailing list
      break;
    case "email.complained":
      // Handle spam complaint — unsubscribe user
      break;
  }

  return NextResponse.json({ received: true });
}
```

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `RESEND_API_KEY` | Server | Resend API key (starts with `re_`) |

## Cross-References

- **Marketplace install and env var provisioning** → `⤳ skill: marketplace`
- **API route patterns** → `⤳ skill: routing-middleware`
- **Environment variable management** → `⤳ skill: env-vars`
- **Serverless function config** → `⤳ skill: vercel-functions`

## Official Documentation

- [Resend + Vercel Marketplace](https://vercel.com/marketplace/resend)
- [Resend Documentation](https://resend.com/docs)
- [Resend Next.js Quickstart](https://resend.com/docs/send-with-nextjs)
- [React Email Documentation](https://react.email/docs/introduction)
- [React Email Components](https://react.email/docs/components/html)
