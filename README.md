# CoTree Plugins (source)

`codex-provider/` is the executable **ChatGPT plan Provider**. Version 0.2.1
uses the host's SIWC registration and public Responses implementation, retaining
`cotree.codex.subscription` and restoring session/turn routing for cache reuse.
The update preserves an existing 0.2.0 account authorization; cache hits remain
subject to upstream availability.
See [installation, authorization and packaging](codex-provider/README.md).

This directory is an independent Git repository. The CoTree host repository
ignores `plugins/`; commit plugin sources from this repository, and host changes
from the parent repository. Local build and integration scripts expect this
checkout at `<CoTree>/plugins`, so keep that layout and run host commands from
the parent directory. Install dependencies with `pnpm install` from that parent
after checking out both repositories. Downloaded offline runtimes, credentials,
dependencies and build output remain untracked.

Hand-authored plugin sources, including declarative packages and executable SDK extensions. Each subdirectory is one plugin package
(`<id>/plugin.json` plus optional `README.md`, `evals/`, assets). These are the
version-controlled *sources*; installing **materializes** them into a workspace or
global plugin registry (local runtime state, not committed).

`pre-transfer/` contains deduplicated CoTree capability families with stable
`cotree.*` identities. Upstream hosts are provenance, not separate products.
See the [catalog and batch queue](pre-transfer/README.md): `native-adapted`
packages contain rewritten workflows; `integration-pending` and
`implementation-pending` still need compatibility work. Installation checks and
real service evidence are recorded separately. These packages are not bundled or
enabled automatically. Retained upstream examples are excluded from the host
TypeScript build.

Native analytics packages retain the original validator and offline report reader,
with audited runtime path patches and standalone Node helpers. Recheck them using
`pnpm exec tsx scripts/verify-native-analytics-resources.mts`; the
[analytics evidence](pre-transfer/analytics-resource-validation.json) records
local synthetic-data rendering separately from account validation. Track service
requirements in the [authentication checklist](pre-transfer/auth-followup.html).

`lsp-offline/` is an offline runtime resource bundle stored here for transfer to
Windows and Kylin V10 machines. Its downloaded binaries are ignored by Git; see
[the offline deployment guide](lsp-offline/README.md) for checksums, architecture
selection and setup. It is not a plugin package and has no `plugin.json`.

## Declarative packages and SDK extensions

Most `pre-transfer/` packages contribute Skills, Agent templates and MCP declarations.
Their Manifest v3 remains supported by the same host runtime. They do not need an npm
SDK dependency merely because the public SDK has advanced.

Executable extensions can use `@cotree/plugin-sdk@0.13.0` / API 1 and Manifest v4.
The public Tool, Service, UI and Provider entries support host-owned tasks, managed
processes, model/HTTP streams, interactions, sessions/workflows and ComputerDriver.
Availability and authorization remain specific to the caller's context; process isolation
does not itself provide an OS sandbox. Code extensions must not create another host
AgentLoop or persistence authority. See the [SDK manual](../docs/plugin-sdk-manual/README.md)
and [pre-transfer adaptation report](pre-transfer/sdk-compatibility.md).

Existing declaration categories remain useful where they fit the feature:

| Slot | Cost | What you write |
|------|------|----------------|
| `modelProviders` | lowest (zero runtime code) | one provider/profile declaration |
| `tools` | low | a governed code tool using host capabilities |
| `memoryProviders` | medium | implement the 5 `MemoryProvider` methods |
| `platformAdapters` | high | a long-lived connection adapter |

## Layout

```
plugins/<id>/
  plugin.json        # manifest (no integrity; the digest is computed at install)
  README.md          # usage (recommended; silences PLUGIN_README_RECOMMENDED)
  evals/*.json       # eval-gate smoke cases (recommended; silences PLUGIN_EVALS_RECOMMENDED)
```

## Add a new OpenAI-compatible provider (roadmap P0-A)

1. Copy `cotree.deepseek-provider/` to `plugins/<cotree.your-provider>/`.
2. Edit `plugin.json`: `id`, `name`, `description`, `modelProviders.providers.<name>`
   (`runtimeProvider: "openai-compatible"`, `defaultBaseUrl`, `defaultApiKeyEnv`) and the
   `profiles` (model ids, baseUrl, `apiKeyEnv`).
3. **Never embed a key** — reference `apiKeyEnv` / `defaultApiKeyEnv` only (the kernel rejects
   any literal `apiKey`).
4. Install + verify from the workspace root:

```bash
cotree plugin install plugins/<id> --scope workspace --yes
node --import tsx scripts/verify-plugin.mts --plugin <id> --workspace .
```

The default scope is `workspace`, which installs under
`<workspace>/.cotree/plugins/installed`. To make a plugin available to every workspace:

```bash
cotree plugin install plugins/<id> --scope global --yes
```

Global plugins live under `$COTREE_HOME/plugins/installed` (default:
`~/.cotree/plugins/installed`). Resolution is deterministic:

1. use a matching workspace plugin;
2. otherwise fall back to the global registry;
3. when an exact version is requested but that version is absent from the workspace,
   the same exact version may fall back to global.

When developing inside this repository, `scripts/install-declarative-plugin.mts` remains a
compatibility wrapper around the same installer. The Desktop import panel accepts either a
plugin directory or a `.zip` containing `plugin.json` at its root (or inside one wrapper
directory). Its target workspace defaults to the current workspace and may be changed to any
known or newly selected folder. The “当前工作区 / 全局” selector controls where the package
is installed; for a global install, the selected workspace is still used to refresh and verify
the effective workspace-first resolution result. Governed proposal installation also accepts
`cotree plugin install-proposal <proposal-id> --scope global --yes`.

Create a standalone distributable from any version-controlled plugin source with:

```bash
pnpm package:plugin -- cotree.deepseek-provider
```

Archives and their SHA-256 sidecars are written under `.cotree/releases/plugins/`.
Feature plugins are not implicitly bundled into Desktop installers; importing,
enabling, disabling, upgrading and removing them all go through the normal registry.

## Built-in capabilities are not plugins

`cotree.autonomy` (目标 / 敬天) and `cotree.team-modes` (串行/并行/混合/审议/头脑风暴) used to live
here as declarative plugin sources. They declared no tools, hooks, or services, so the plugin host
never ran their code — they were manifest data pointing at kernel-owned runtimes. They now ship as
built-in system capabilities (`packages/plugins/src/builtin-capabilities.ts`), are available in
every workspace with no install, and cannot be packaged or published.

Both ids are **reserved**. Installing a package that claims one is not an error, but the built-in
wins: the installed copy contributes nothing, the contribution snapshot reports
`PLUGIN_SUPERSEDED_BY_BUILTIN`, and the package can be uninstalled. This is what keeps a leftover
copy of the old 1.2.0 / 1.4.0 zips from colliding with (and thereby disabling) the built-in.

A clean result is `validation.ok: true`, `package.ok: true`, `digestMatch: true`, with the
only warning being `PLUGIN_SECRETS_RISK` (expected whenever a plugin declares secret access).

## Allowed `runtimeProvider` values

`mock`, `openai-compatible`, `openai-responses`, `anthropic`, `azure-openai`,
`google-gemini`, `aws-bedrock`, `anthropic-vertex`.

## Reference example

`cotree.deepseek-provider/` — DeepSeek (V3 `chat` + R1 `reasoner`) via `openai-compatible`,
auth through `DEEPSEEK_API_KEY`.
