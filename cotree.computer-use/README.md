# Computer Use

Version 1.8.7 requires action protocol 4; CoTree Desktop 0.1.281 supplies the
matching file-input identity and current-focus fixes. Unlabelled native upload controls retain their
APC display text separately from the same-node AX name used for input validation.
Genuine document, node and accessible-name changes still reject old authority.
File discovery uses observed inputType/actions instead of guessed localized labels.
Caret insertion uses only freshly observed focus, not historical focused flags
on retained addresses outside the latest partial observation.

The skill now follows the current host SDK for nameless inputs, custom comboboxes,
file uploads, cascading fields and explicit browser handback. Shared host guidance
also reaches the built-in provider without this optional plugin. Read-only query
transport recovery never replays earlier uploads/clicks. Desktop's native control
shield blocks accidental page input until explicit takeover; ordinary mouse motion
does not transfer the browser space.

The embedded browser ships its own CUA runtime. Installing this plugin adds an
optional provider; select `browser.providerId = "cotree.computer-use"` explicitly
to use it. The plugin browser service shares the built-in implementation,
including host-issued addresses, native APC when available, and complete nested
frame hit checks. Disabling a selected plugin stops that provider; explicitly
select `cotree.browser.builtin` to return to the bundled runtime. Installation or
removal never changes the default or deletes the built-in assets/profile.

Pointer feedback queues its animation without awaiting visual arrival. Cursor
ownership, cancellation and revision checks still apply; no detached animation
task can resume a revoked cursor. Actual input retains the 1.8.2 live checks below.

Trusted ref clicks recheck the live hit target and enabled state after hover,
before button down. The check follows composed shadow ancestry, native disabled
controls, `aria-disabled` ancestors and `inert`, and proves that an OOPIF's owner
is not covered in the embedding page. Right clicks use the same check; double
clicks recheck before their second press and never replay the first click.
Embedding-frame mapping includes scrollbar space in the child's inner viewport,
preserving the actual hit point under narrow parent-page overlays.
Failed or unsupported checks refuse input with `browser_action_unavailable`.
These checks preserve exact ref identity; they do not rebind by accessible name.
The check and Chromium input are separate protocol commands, so this narrows
rather than eliminates races with continuously changing pages. Coordinate-only
input and explicitly synthetic DOM events do not assert an element hit target.

Cancelled browser calls close admission and wake parked host event polls before waiting for native transport shutdown. Input settlement and replay protection remain owned by the Desktop browser journal; transport cleanup never certifies or repeats an input.
The native Node bridge queues UniFFI Future wake notifications without waiting for JavaScript, avoiding a scheduler-lock deadlock with concurrent host replies. Only the exact scalar, void-return continuation ABI uses this path; ordinary callbacks retain their return and out-pointer synchronization.
Explicit assertions after a key sequence or clipboard action use the host's existing observation phase after input completes. Navigation from the final input can be verified without permitting further input across the original document fence. Callback failures also preserve the underlying host reason.
The embedded Cua browser exposes `paste` / `pasteTable` and `copyText` / `copyTable`
through the existing ComputerDriver and input journal. Native clipboard events
preserve range text; copy returns fresh selected content, not a pre-existing
clipboard value. Transfers use the system clipboard. Unique focused editable
insertion is discovered from current Cua state; explicit stale refs are refused.
Popup receipts identify child tabs without changing the opener handle. The bundled
skill describes content readback, state-based waiting and optional readable layout.

Version 1.7.1 pairs with Desktop 0.1.177 to load this package's Skill automatically when browser or desktop capabilities enter the model context. The existing Skill loader and task binding retain full instructions without a separate installation or repeated model calls. Final-step navigation no longer fails sequence completion or owned input/focus cleanup; navigation before remaining steps still interrupts input. Native acknowledgement survives a cleanup error. The Skill includes the field-locator workflow (`tab.byRef(ref).fill(text)`), with no retired API aliases. See [the investigation](../../docs/exec-plans/computer-use-skill-navigation-2026-10-05.md).

Version 1.7.0 includes `skills/computer-use/SKILL.md` in this plugin's integrity-checked package contents. Installation, upgrade and disable use the existing plugin skill catalog; no separate skill download is needed. The skill covers target binding, current Driver discovery, bounded local loops and receipt-based recovery. Action protocol 3 adds a read-only DOM feedback path, typed inspect/select and history navigation. Browser action commands use `browser_*`; retired browser command names have no compatibility mapping. Viewport coordinates survive ordinary input, DOM updates and presentation-only changes; document/scroll/viewport/zoom changes still require a fresh observation. See [the implementation record](../../docs/exec-plans/cua-usability-skill-2026-10-05.md) for verification and matching host requirements.

Version 1.6.0 pairs with Desktop 0.1.173 for local continuous control. `tab.sequence`
executes held keys/buttons, repetition and exact-selector or observed-coordinate
input in one native operation; `tab.query` supplies bounded current DOM feedback
without AX/screenshot collection. `tab.press` supports navigation keys and key
combinations beyond Enter. Long ControlScript loops use configurable deadlines
and archived receipts, with cancellation, target identity and emergency input
release preserved. See [continuous control](../../docs/computer-use-runtime.md).
This replaces the historical Enter-only limitation below. Existing platform
Driver catalog operations remain available through `desktop.driver.tools()`.

Version 1.5.5 supports full-page browser captures through Cua's existing CDP engine. Pointer presses and wheel events first move Chromium's mouse; drag feedback follows the path, and new Agent cursor feedback remains visible on the exact visible owner after blur. Browser cursor motion uses a direct 160 ms transition with fixed heading and no arrival spring, avoiding short-distance turning loops. Full-page screenshots do not grant viewport coordinate authority. Install the complete plugin and Desktop 0.1.170 or later together; see the [capture and pointer investigation](../../docs/exec-plans/browser-capture-pointer-2026-10-04.md).

The 1.5.4 capture registry correction remains: no default wall-clock expiry, bounded storage, exact target/session identity, current dimensions and optional explicit TTL. Version 1.7.0 replaces single-use consumption with validation of the current viewport mapping. The host ABI and permissions are unchanged.

Version 1.5.3 fixed a native semantic-page loop that could block state reads, screenshots and cancellation after a page loaded. Accessibility node IDs are indexed by frame/document identity, and parent traversal stops at repeated nodes. That fix remains included; its evidence is in the [live timeout investigation](../../docs/exec-plans/browser-observation-live-timeout-2026-09-28.md).

Version 1.5.2 added screenshot cancellation and service restart recovery with Desktop 0.1.146. An unknown browser binding can only be created by explicit attachment; a restarted engine gets a new host binding generation before producing refs. The next independent read can recover once, while old refs fail and input is never replayed. Screenshot cancellation reaches the plugin/native future from both the screenshot tool and combined observation. Native host reads discard late results without replacing fresh refs or coordinate evidence; RPC cancellation and deadlines no longer masquerade as lost browser sessions. See [the lifecycle audit](../../docs/exec-plans/computer-use-lifecycle-audit-2026-09-28.md).

Version 1.5.1 fixes event acknowledgement during embedded browser observation: Cua acknowledges only events consumed by its native demultiplexer. A cancelled or timed-out subread can discard a foreign callback reply; its events remain replayable instead of leaving subsequent state/screenshot reads waiting for an event gap. This plugin works with Desktop 0.1.145; the host RPC contract is unchanged. See [the investigation and verification](../../docs/exec-plans/browser-state-timeout-2026-09-28.md).

Version 1.5.0 makes desktop post-input observation opt-in, preserving acknowledged input when requested readback fails. Host Desktop 0.1.145 routes base desktop aliases through the selected Driver and retires browser batch resume. Use fresh observations plus new actions after interruption; status/cancel and durable receipts remain.

Optional Cua execution provider for CoTree's existing browser and desktop SDK. Browser Use and the separate desktop operator packages are superseded by this product; the complete native execution path ships with the host.

Version 1.4.1 requires the host's `computerUse.actionProtocol:2`: each embedded input uses one `browser.action` admission with optional assertions. `inputAcknowledged` confirms delivery independently of business verification; ordinary fill/check/click no longer force snapshots or stop subsequent input. Both providers publish `tools/read/call` contracts (embedded `tab.driver`, desktop `desktop.driver`), and native-only capabilities are explicit extensions. Driver recovery is target-specific; compacted historical receipts keep every replay identity without a 256-operation task limit. Screenshot validity follows real target/geometry changes rather than an extra 30-second cutoff. See [the execution plan](../../docs/exec-plans/computer-use-unification-2026-09-28.md) for actual validation and platform limits. The embedded SDK now calls ComputerDriver directly; shared core declarations drive native/Cua catalogs, aliases and validation. Combined AX/image observations share screenshot evidence without recapture. Explicit human input cancels waiting operations instead of fixed cooldowns; separate Cua targets can read concurrently with exact per-call native authorization. Physical input retains the host seat. Desktop compatibility calls now use the same atomic service without the retired plan/explore/execute engine or application-memory route. Explicit verification accepts current-window conditions; checkpoint migration preserves old replay facts without resuming plans. The following version notes are historical.

Version 1.2.0 pairs with Desktop 0.1.142. It forwards semantic query/scope/continuation to Cua, preserves native node capabilities, separates document generation from snapshot IDs, captures images without invalidating refs, waits for DOM readiness and exposes only implemented browser SDK methods. Embedded file uploads and downloads use Cua with exact host file admission. Pure screenshots support capture-bound coordinate click, double click, hover, scroll and drag. The host contains service pipe failures without terminating the workspace kernel or replaying input.

Host-only readiness reads never acknowledge Cua events: only the native demultiplexer's contiguous consumed cursor acknowledges event envelopes. Cancellation reaches the generated SDK's native future; a cancelled transport is retired and the next explicit observation reattaches once with fresh refs. Queued cancelled work never starts. Desktop owns bounded read recovery without additional dispatcher timeout retries, and repairs a lost native cursor while the host still presents that target.

Navigation accepts a redirect only with Cua's successful dispatch acknowledgement, a committed new host document and a fresh DOM-ready native observation. It returns the actual final URL. Explicit URL postconditions remain strict; missing or unchanged document evidence cannot certify a redirect.

The additional `desktop.driver.tools(names?)`, `.read(name,input)` and `.call(name,input)` surface exposes the actual platform Driver catalog and schemas through `ComputerDriver`. This includes external browsers, window/desktop input, clipboard, recording, sessions and cursor controls. Each host scope has its own native runtime. The host owns session identity, input leases, replay receipts, filesystem ceilings and native authority callbacks; uncertain input remains fenced across service restarts. Platform or runtime refusals remain explicit. This is a Driver integration, not a second agent loop or a cloud/fleet integration.

Every native call shares the host's authenticated lifecycle session, including tools whose public schema omits `session` (zoom, visual parsing, recording and configuration). Successful management commands acknowledge the command without claiming a UI change; they cannot clear an earlier uncertain input. Recorded actions receive individual host admission immediately before native replay dispatch, with the same child filesystem and image-evidence ceilings.

Optional local dependencies are installed separately: Cua Perception via its publisher-signed platform catalog for `parse_visual_regions`, and FFmpeg on PATH for Windows/Linux video recording. Neither is downloaded during ordinary capture or silently bundled into this plugin. The native lifecycle, license notices and integrity checks remain intact. No Cua Agent, Cloud, Fleet or remote Receiver is included. Acceptance results and known platform restrictions are tracked in `docs/exec-plans/cua-complete-capability-integration-2026-09-28.md`.

The plugin needs explicit executable package trust and the normal browser/desktop operation permissions. Native addons run in a separate process; this is crash and lifecycle isolation, not an OS sandbox for malicious native code. The manifest names and hashes the exact addon and SDK library. Do not enable native modules for unrelated plugins.

Build the pinned SDK using `integrations/cua` instructions, then run `node --import tsx plugins/cotree.computer-use/scripts/build.mts`. The SDK stage defaults to `.cotree/artifacts/cua/sdk`. The output is a verified plugin directory suitable for the existing plugin installer. No installed plugin or trust grant is modified by the build.

Use `pnpm build:computer-use-plugin` to also create the platform ZIP and print its SHA-256. Install that ZIP through CoTree's existing plugin manager and grant executable trust to this package digest. Provider changes require settled input and a fresh observation.

Version 1.0.5 deduplicates native cursor-hide revisions shared by the idle notification and CDP event channels. A delayed duplicate after a window resize no longer cancels the next operation's cursor before its first pulse. It preserves newer hide notifications, explicit cancellation and owner-window checks. Desktop 0.1.127 also shares the model's browser manager with the panel and keeps the control-bar height stable. Verification evidence and remaining limits are recorded in `docs/exec-plans/computer-use-visible-paint-2026-09-26.md`.

Version 1.0.3 pairs with Desktop 0.1.125 for Cua's native cursor overlay, settled read recovery after CDP loss, generation-scoped refs, and reuse of action verification observations. Browser check/semantic drag/dialog, editable-target Enter without modifiers, and desktop target-bound text insertion/toggle use Cua's existing operations. Enter requires a fresh editable ref or unique role/name locator; it preserves field content and follows the page's normal newline or submission behavior. Other keys and modifier combinations remain unsupported. Unsupported actions remain explicit. Version 1.0.2 fixed the missing eval declarations/files in 1.0.1. Reinstall the new ZIP, then enable it and review the exact-digest consent dialog. Each new package needs its own trust grant. The build checks the install/eval content gates before creating a ZIP. These checks validate the declared evaluation cases; they do not claim that an agent or GUI test has run. Real activation and browser/desktop evidence is recorded separately in the integration reports.

`COTREE_COMPUTER_PROVIDER=auto` selects the trusted compatible plugin for new bindings, otherwise native. `native` forces host execution; `cua` requires Cua and refuses when unavailable. After input is dispatched there is no action-level fallback. Package changes revoke admission and require a settled boundary and fresh observation.

Each ZIP targets one operating system and architecture. Kylin V10 x86_64 uses the Linux x64 build compiled with glibc 2.31; install it alongside the matching Kylin Desktop package. X11 desktop control uses the native Linux backend. Wayland operations depend on the compositor and approved portal capabilities; portable builds include portal input, while PipeWire portal capture and optional visual parsing require separate runtime support and acceptance evidence. The Windows native host-browser cursor overlay is not available on Linux. Embedded pages retain Electron's existing WebContentsView and profile; actual observation and supported input use Cua BrowserEngine. External Chromium uses native target/window/endpoint proof, including an exact host-authorized existing-profile attachment. Cua refuses automatic isolated Chromium launch when the current elevated Windows token can write the installed executable; run non-elevated for that route. The host does not weaken this upstream guard. Embedded page PNGs do not authorize physical-screen coordinates. macOS and other architectures require their own native build and validation.

Cua source and license attribution are recorded in `integrations/cua`. The staged package must retain the upstream MIT and copy-runtime MPL notices.

Version 1.6.1 pairs with Desktop 0.1.174 for staged download deadlines and nonblocking cursor feedback. Downloads default to a 120-second total budget (`download(root,{timeoutMs})`, 1–600 seconds), with 30-second start/transfer-idle and 90-second finalization waits. Only new received bytes extend transfer time; finalization events do not keep a stalled operation alive. Success still requires Chromium completion and canonical file readback. Transport deadlines outlive native work, and cancellation remains immediate. Windows cursor seeding runs on the render thread; input and presentation diagnostics never synchronously wait for its paint mutex. Investigation and exact validation are recorded in `docs/exec-plans/cua-download-coordinate-root-cause-2026-10-04.md`.
