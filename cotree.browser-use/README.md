# CoTree Browser Use

The official direct browser-use plugin. It uses the existing CoTree plugin broker and `PluginBrowserClient`; it does not start an MCP server or expose credentials to plugin code.

`ControlScript` is the Agent entry point for browser actions. It keeps handles, observation boundaries, checkpoints, and receipts in one host-owned session. The `BrowserUse` broker adapter is host/integration-only (`agentExposure: never`) and does not add a second Agent tool.

The package owns its executable facade (`sdk/browser-sdk.js`), current documentation (`sdk/documentation.json`), and host protocol/operation declaration (`sdk/contract.json`). They are covered by the package digest. The host checks installation state, exact digest, execution trust, protocol, and fixed resource paths before injection. Model code cannot supply SDK source or resource paths.

Each SDK call rechecks the live provider generation and prepared operations. Disable, trust revocation, package modification, upgrade, and rollback retire old handles. Revocation cancels in-flight work while retaining dispatched-operation receipts; it never closes user tabs or replays uncertain input. A later installation can inject the SDK into an existing basic JavaScript heap. Rebind and observe after a capability generation changes.

Version 1.2.0 adds `tab.diagnostics(operation, options)` through the narrow `BrowserDiagnostics` contract. It reads up to 100 recent console entries or network transfer summaries from an observed session/tab; it cannot evaluate JavaScript, invoke arbitrary CDP methods, enable capture, or read network bodies, headers or cookies. Network URLs omit credentials, query and fragment. Diagnostics do not refresh a UI observation or resolve uncertain input. Backends without the recorded diagnostics report unavailable.

The bundled `networkMetadata: "deny"` remains unchanged. Diagnostics require both `pageContent` and `networkMetadata` grants, plus host permissions; the SDK omits this method's operation binding by default. A changed package permission requires fresh package verification and execution trust. Existing seven browser operations continue under their current grants. Install this package together with a host that understands its updated operation contract; an older contract is rejected explicitly rather than injected with mismatched methods.

If this plugin is not installed, ControlScript still provides its base JavaScript runtime, checkpoints, status, and recovery APIs. Browser SDK bindings are omitted from the request and direct browser tools are not prepared by the browser-use capability selector.
