---
name: "import.codex.vercel.payments"
description: "Stripe payments integration guidance — native Vercel Marketplace setup, checkout sessions, webhook handling, subscription billing, and the Stripe SDK. Use when implementing payments, subscriptions, or processing transactions."
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

# Stripe Payments Integration

You are an expert in Stripe payments for Vercel-deployed applications — covering the native Vercel Marketplace integration, Checkout Sessions, webhook handling, subscription billing, and the Stripe Node.js SDK.

## Vercel Marketplace Setup (Recommended)

Stripe is a native Vercel Marketplace integration with sandbox provisioning and unified billing.

### Install via Marketplace

```bash
# Install Stripe from Vercel Marketplace (auto-provisions sandbox + env vars)
vercel integration add stripe
```

Auto-provisioned environment variables:
- `STRIPE_SECRET_KEY` — server-side API key
- `STRIPE_PUBLISHABLE_KEY` — client-side publishable key
- `STRIPE_WEBHOOK_SECRET` — webhook endpoint signing secret

### SDK Setup

```bash
# Server-side SDK
npm install stripe

# Client-side SDK (for Stripe Elements / Checkout)
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Initialize the Stripe Client

```ts
// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});
```

## Checkout Sessions

### Server Action (Recommended for 2026)

Server Actions are the preferred pattern for creating Checkout Sessions in Next.js 15+, eliminating the need for API routes:

```ts
// app/actions/checkout.ts
"use server";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
  });

  redirect(session.url!);
}
```

```tsx
// app/pricing/page.tsx
import { createCheckoutSession } from "@/app/actions/checkout";

export default function PricingPage() {
  return (
    <form action={createCheckoutSession.bind(null, "price_xxx")}>
      <button type="submit">Buy Now</button>
    </form>
  );
}
```

### Create a Checkout Session (API Route)

```ts
// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "payment", // or "subscription" for recurring
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
```

### Redirect to Checkout (Client)

```tsx
"use client";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutButton({ priceId }: { priceId: string }) {
  const handleCheckout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  return <button onClick={handleCheckout}>Subscribe</button>;
}
```

## Webhook Handling

Stripe sends events to your webhook endpoint for asynchronous payment processing. Always verify the signature.

```ts
// app/api/webhook/stripe/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Fulfill the order — update database, send confirmation, etc.
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle successful subscription renewal
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle cancellation — revoke access
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

**Important**: Webhook routes must read the raw body as text (not JSON) for signature verification. Do not add `bodyParser` or JSON middleware to webhook routes.

## Subscription Billing

### Create a Subscription Checkout

```ts
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
});
```

### Customer Portal

Allow customers to manage their subscriptions:

```ts
// app/api/portal/route.ts
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { customerId } = await req.json();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return Response.json({ url: session.url });
}
```

## Embedded Checkout (Recommended)

Stripe's Embedded Checkout renders inside your page via an iframe, keeping users on your domain while offloading PCI compliance to Stripe:

```ts
// app/actions/embedded-checkout.ts
"use server";
import { stripe } from "@/lib/stripe";

export async function createEmbeddedCheckout(priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    ui_mode: "embedded",
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  return { clientSecret: session.client_secret! };
}
```

```tsx
"use client";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { createEmbeddedCheckout } from "@/app/actions/embedded-checkout";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutEmbed({ priceId }: { priceId: string }) {
  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret: () => createEmbeddedCheckout(priceId).then(r => r.clientSecret) }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```

## Stripe Elements (Custom Forms)

```tsx
"use client";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/success` },
    });

    if (error) console.error(error.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Pay</button>
    </form>
  );
}

export function PaymentForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  );
}
```

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `STRIPE_SECRET_KEY` | Server | API secret key (starts with `sk_`) |
| `STRIPE_PUBLISHABLE_KEY` | Client | Publishable key (starts with `pk_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Alias exposed to browser via Next.js |
| `STRIPE_WEBHOOK_SECRET` | Server | Webhook signing secret (starts with `whsec_`) |

## Cross-References

- **Marketplace install and env var provisioning** → `⤳ skill: marketplace`
- **Webhook route patterns** → `⤳ skill: routing-middleware`
- **Environment variable management** → `⤳ skill: env-vars`
- **Serverless function config** → `⤳ skill: vercel-functions`

## Official Documentation

- [Stripe + Vercel Marketplace](https://vercel.com/marketplace/stripe)
- [Stripe Node.js SDK](https://docs.stripe.com/sdks)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Elements](https://docs.stripe.com/payments/elements)
