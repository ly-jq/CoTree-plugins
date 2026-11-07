# cotree.mem0-memory

Declarative **Mem0** external memory provider for CoTree. Adds a cross-session **semantic
search** layer over your long-term memory **without forking kernel source** and **without
embedding any API key** (auth is via the `MEM0_API_KEY` environment variable only).

This is the reference example for a **declarative memory-provider plugin** (roadmap P0-B).

## How it works

The runtime factory for `runtimeProvider: "mem0"` is a trusted built-in
(`packages/memory/src/provider/mem0-memory-provider.ts`); this plugin only *declares* the
provider so it becomes selectable + governed:

| Operation | Backed by |
|-----------|-----------|
| `upsert` / `query` / `get` / `delete` | local SQLite repository (authoritative; keeps evidence chain + provenance) |
| `search` | Mem0 V3 semantic search when `MEM0_API_KEY` is set; falls back to a local query otherwise / on error |

Mem0 writes are best-effort and never block or fail a local write.

## What it declares

| Kind | Id | Detail |
|------|----|--------|
| memory provider | `cotree.mem0-memory.mem0` | runtimeProvider `mem0`, `search: true` |

## Requirements

- `MEM0_API_KEY` — your Mem0 platform API key (read from the environment at call time).
- `MEM0_BASE_URL` *(optional)* — override the default `https://api.mem0.ai`.
- `MEM0_USER_ID` *(optional)* — Mem0 entity id that scopes memories (default `cotree`).

## Install / enable

```bash
node --import tsx scripts/install-declarative-plugin.mts \
  --source plugins/cotree.mem0-memory/plugin.json --workspace .
```

Then select it as the active provider in `.agent/config.json`:

```json
{ "memoryProvider": { "id": "cotree.mem0-memory.mem0" } }
```

With no selection the workspace stays on `local` (byte-for-byte unchanged).

## Verify

```bash
node --import tsx scripts/verify-plugin.mts --plugin cotree.mem0-memory --workspace .
```

## Disable / uninstall

- **Disable** (revert to local): remove `memoryProvider.id` from config, or re-run install
  with `--state disabled`.
- **Uninstall**: delete `.agent/plugins/installed/cotree.mem0-memory/`.

## Notes

- **No raw keys.** Only `MEM0_API_KEY` is referenced via the environment; the kernel rejects
  any embedded key and the manifest declares `secrets: ["MEM0_API_KEY"]`.
- Without a key the provider is fully functional for local round-trip; only the semantic
  `search` enhancement is inactive (it falls back to a local query).
