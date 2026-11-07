# Voice Tools (`cotree.voice-tools`)

This first-party Code Plugin provides OpenAI speech-to-text (`PluginCoTreeVoiceToolsAudioTranscribe`) and text-to-speech (`PluginCoTreeVoiceToolsAudioSpeech`).

Both tools execute in the ordinary out-of-process ABI v2 host. `PluginCoTreeVoiceToolsAudioTranscribe` accepts either a workspace audio path or bounded canonical base64 and uses host-encoded multipart data, so the plugin does not construct an unbounded request body. `context.credentials.fetch` injects `AUDIO_API_KEY` or `OPENAI_API_KEY` only after destination validation; no credential value enters the plugin process.

`PluginCoTreeVoiceToolsAudioSpeech` writes a real workspace audio file (defaulting to `cotree-output/`) through `context.files` and returns a resource reference plus path/format/byte metadata. Audio bytes never enter durable JSON. Because this is a paid, mutating operation, the tool is medium-risk, non-idempotent, and always requires approval even after Agent exposure.

Because the manifest declares credentials, the default `safe` Agent policy does not expose these tools automatically. Use `pluginRuntime.agentTools.allow` for the plugin or selected tools. Normal Kernel approval policy remains in force.

Build a release package with:

```text
pnpm package:plugin -- cotree.voice-tools --output-dir .cotree/releases/plugins
```
