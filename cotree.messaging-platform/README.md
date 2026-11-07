# cotree.messaging-platform

Declarative **messaging platform adapters** for CoTree's gateway — **Telegram** and
**WeChat Work / WeCom (企业微信)** — **without forking kernel source** and **without
embedding any credentials** (auth is via environment variables only).

This is the reference example for a **declarative platform-adapter plugin** (roadmap P0-C).

> Personal WeChat has no official bot API, so the WeChat-family adapter targets **WeCom
> (企业微信)**, which exposes a first-class app-message API.

## How it works

The runtime factories for `runtimeAdapter: "telegram"` / `"wecom"` are trusted built-ins
(`packages/gateway/src/adapters/telegram.ts` / `wecom.ts`); this plugin only *declares* the
adapters so they become selectable + governed and the gateway instantiates them.

| Platform | Inbound | Outbound |
|----------|---------|----------|
| Telegram | long-polling `getUpdates` (the gateway runner drives `start`) | `sendMessage` |
| WeCom | webhook callback → `ingest()` (the gateway HTTP entrypoint hands it a normalized payload; XML/AES decryption is an integration-layer concern) | app message `message/send` via cached `access_token` |

Adapters normalize every inbound payload into a `MessageEvent` and **redact** secret-looking
keys before anything is persisted to events.

## What it declares

| Kind | Id | Detail |
|------|----|--------|
| platform adapter | `cotree.messaging-platform.telegram` | runtimeAdapter `telegram`, media + threads |
| platform adapter | `cotree.messaging-platform.wecom` | runtimeAdapter `wecom`, media |

## Requirements

Telegram:
- `TELEGRAM_BOT_TOKEN` — your bot token from @BotFather.
- `TELEGRAM_BASE_URL` *(optional)* — override `https://api.telegram.org`.

WeCom (企业微信):
- `WECOM_CORP_ID`, `WECOM_CORP_SECRET`, `WECOM_AGENT_ID` — your WeCom app credentials.
- `WECOM_BASE_URL` *(optional)* — override `https://qyapi.weixin.qq.com`.

Without credentials an adapter stays inert/declared (it shows up in `gateway platforms` but
polls nothing / cannot send), so the default gateway is unchanged.

## Install / enable

```bash
node --import tsx scripts/install-declarative-plugin.mts \
  --source plugins/cotree.messaging-platform/plugin.json --workspace .
```

The gateway picks up activated adapters automatically (alongside the built-in webhook
adapter) when the daemon resolves adapters.

## Verify

```bash
node --import tsx scripts/verify-plugin.mts --plugin cotree.messaging-platform --workspace .
```

## Disable / uninstall

- **Disable**: re-run install with `--state disabled`.
- **Uninstall**: delete `.agent/plugins/installed/cotree.messaging-platform/`.

## Notes

- **No raw credentials.** Manifests declare `secrets: [...]` and only read tokens from the
  environment; the kernel rejects embedded secrets.
- `network.allowDomains` restricts egress to `api.telegram.org` + `qyapi.weixin.qq.com`.
