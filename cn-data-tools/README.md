# CN Data Tools (`cotree.cn-data-tools`)

This first-party Code Plugin provides three current-data tools:

| Tool | Source |
| --- | --- |
| `PluginCoTreeCnDataToolsWeatherGet` | wttr.in |
| `PluginCoTreeCnDataToolsFinanceQuote` | Sina / Eastmoney public quote and name-resolution APIs |
| `PluginCoTreeCnDataToolsNewsSearch` | China News / People's Daily feeds |

All three tools execute in the standard out-of-process ABI v2 host. Network requests cross `context.network`; the plugin process has no direct workspace, socket, shell, browser, or credential access. There is no first-party runtime id or in-process factory.

`PluginCoTreeCnDataToolsFinanceQuote` accepts either a code/symbol (`600519`, `SH600519`, `600519.SH`) or a Chinese stock name such as `贵州茅台`. `PluginCoTreeCnDataToolsNewsSearch` uses HTTPS-only allowlisted feeds; individual broker calls time out after five seconds so a stale source cannot monopolize the 30-second tool budget. Results include source attempts and quality metadata for Agent-side recovery.

The default Agent policy exposes these tools because they are low-risk, idempotent, and do not use credentials. Operators can override that with `pluginRuntime.agentTools.allow` and `deny`.

Build a release package from the repository root:

```text
pnpm package:plugin -- cotree.cn-data-tools --output-dir .cotree/releases/plugins
```

The generated ZIP contains a bundled `dist/index.mjs` entry and can be installed through the plugin package installer.
