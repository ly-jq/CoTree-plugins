# Doc Tools (`cotree.doc-tools`)

This first-party Code Plugin keeps ten ZIP, Office Open XML, PDF, and OCR tools outside the Kernel:

- `PluginCoTreeDocToolsArchiveList`, `PluginCoTreeDocToolsArchiveExtract`, `PluginCoTreeDocToolsArchiveCreate`
- `PluginCoTreeDocToolsOfficeDocxRead`, `PluginCoTreeDocToolsOfficeDocxEdit`
- `PluginCoTreeDocToolsOfficeDocumentEdit`, `PluginCoTreeDocToolsOfficeDocumentInspect`, `PluginCoTreeDocToolsOfficeDocumentVerify`
- `PluginCoTreeDocToolsPdfRead`, `PluginCoTreeDocToolsPdfOcr`

Every workspace byte crosses `context.files`; the plugin process receives read access only for tools declaring `file.read`, and write access only for tools declaring `file.write`. Writes are atomic and support `create` plus `overwrite` preconditions. ZIP input is bounded and checked for path traversal, duplicate/case-colliding names, encryption, ZIP64, unsupported compression, high compression ratios, size mismatch, and CRC corruption before extraction. No document implementation or trusted runtime factory remains in `packages/plugins`.

The Agent surface contains four specialist tools: `OfficeDocumentInspect`, `OfficeDocumentVerify`, `PdfRead`, and `PdfOcr` (with the plugin prefix above). The other six declarations use `agentExposure: "never"`: they are excluded from Agent discovery even with an explicit allow rule. Their brokered handlers and complete input schemas remain available through the existing extension CLI. No new executor is introduced.

| CLI command ID | Handler |
| --- | --- |
| `cotree.doc-tools.archive-list` | `ArchiveList` |
| `cotree.doc-tools.archive-extract` | `ArchiveExtract` |
| `cotree.doc-tools.archive-create` | `ArchiveCreate` |
| `cotree.doc-tools.docx-read` | `OfficeDocxRead` |
| `cotree.doc-tools.docx-edit` | `OfficeDocxEdit` |
| `cotree.doc-tools.office-edit` | `OfficeDocumentEdit` |

With CoTree on PATH and this plugin version installed, enabled and trusted, list commands using `cotree extension list --workspace <workspace> --json`. Save an input object matching the handler's schema in [plugin.json](plugin.json) as `input.json`, then call it through Bash:

```bash
cotree extension run cotree.doc-tools.archive-list --workspace . --input-json "$(cat input.json)" --json
```

PowerShell equivalent:

```powershell
cotree extension run cotree.doc-tools.archive-list --workspace . --input-json (Get-Content -Raw -LiteralPath input.json) --json
```

For that example, `input.json` can contain `{"path":"bundle.zip"}`. Each command creates a separate audited Kernel Run; it is not execution inside the calling Agent's Session. Check the returned command `status` and `result.ok`, not just the process exit. Mutations retain approval requirements: preserve `runId`, resolve the existing run-scoped approval with manual resume, then repeat the same command and input with `--run-id <runId>`. Do not change trust settings to bypass an approval or use `plugin tool-exec` as a substitute; that command is an operator diagnostic outside the Kernel Run path.

`PluginCoTreeDocToolsPdfRead` uses packaged PDF.js for page-aware embedded text extraction, with a conservative legacy-stream fallback only for malformed PDFs. OCR dependencies and Chinese/English language data are materialized as read-only plugin assets during packaging, not copied to an OS temp directory or resolved from a privileged Kernel/skill-pack runtime. Build the distributable with:

```text
pnpm package:plugin -- cotree.doc-tools --output-dir .cotree/releases/plugins
```

The release packager materializes production dependencies without symlinks or junctions so the hardened ZIP installer can validate and extract the archive. OCR uses Tesseract WASM plus a pure-JavaScript PNG encoder; it does not require Node native-addon permission and the same package is portable across supported desktop platforms.

`notebook.read` and `notebook.edit` remain Kernel tools because they are workspace coding primitives rather than Office/PDF/archive integrations.
