# cotree.deepseek-provider

Declarative **DeepSeek** model provider for CoTree. Adds the DeepSeek OpenAI-compatible
provider plus two model profiles **without forking kernel source** and **without embedding
any API key** (auth is via the `DEEPSEEK_API_KEY` environment variable only).

This is the reference example for a **declarative provider plugin** (roadmap M0 / P0-A):
zero runtime code, pure manifest declaration, governed install.

## What it declares

| Kind | Id | Detail |
|------|----|--------|
| provider | `cotree.deepseek-provider.deepseek` | runtimeProvider `openai-compatible`, baseUrl `https://api.deepseek.com/v1` |
| profile | `cotree.deepseek-provider.chat` | model `deepseek-chat` (DeepSeek-V3) |
| profile | `cotree.deepseek-provider.reasoner` | model `deepseek-reasoner` (DeepSeek-R1) |
| alias | `cotree.deepseek-provider.deepseek` | → `chat` |

## Requirements

- `DEEPSEEK_API_KEY` — your DeepSeek API key (read from the environment at call time).
- `DEEPSEEK_BASE_URL` *(optional)* — override the default base URL.

## Install / enable

From the workspace root:

```bash
node --import tsx scripts/install-declarative-plugin.mts \
  --source plugins/cotree.deepseek-provider/plugin.json --workspace .
```

This materializes the package to
`.agent/plugins/installed/cotree.deepseek-provider/versions/1.0.0/` (computing the
integrity digest over every packaged file) and writes the `active.json` pointer with
`state: "enabled"`.

## Verify

```bash
node --import tsx scripts/verify-plugin.mts --plugin cotree.deepseek-provider --workspace .
```

Runs the kernel's own checks: registry discovery, manifest schema validation, and package
integrity digest verification.

## Disable / uninstall

- **Disable** (keep files, hide from catalog): re-run install with `--state disabled`.
- **Uninstall**: delete `.agent/plugins/installed/cotree.deepseek-provider/`.

## Notes

- **No raw keys.** Manifests may only reference `apiKeyEnv` / `defaultApiKeyEnv`; the kernel
  rejects any embedded `apiKey`.
- Pricing declared in the profiles is indicative (USD per 1M tokens) — confirm against
  DeepSeek's current pricing.
- `evals/provider-smoke.json` cases run only through the eval gate with a valid
  `DEEPSEEK_API_KEY`; they are not executed during install.
