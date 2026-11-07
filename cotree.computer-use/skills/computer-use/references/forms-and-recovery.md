# Forms and recovery

Use only current observed targets and the selected runtime's SDK schemas.
SDK help is asynchronous: `const help = await tab.help('upload');` returns
the current backend's SDK signatures and options. Learn once and reuse them.

| Observed control | Action |
| --- | --- |
| Editable text/email/number/date | `tab.byRef(ref).fill(value)`; group known edits, then read relevant values together |
| Checkbox/radio/switch | `tab.byRef(ref).setChecked(true)`; choose a different radio to change selection |
| Native select | `tab.byRef(ref).selectOption({label: observedOptionLabel})` |
| Custom combobox | Open/fill its editable control, observe options, then click the intended option |
| File input | `tab.byRef(ref).upload([absoluteExistingPath])` |

Do not apply `selectOption` to a custom dropdown. After selecting a State, observe
the enabled City control and its current options. A visible placeholder is not
an option or accessible name. Press Enter to commit a combobox only when the
matching highlighted option is observed. Multi-select subjects may become chips;
read the selected values before continuing.

For a date input, read its format and actual value after filling. If it is
read-only or resets an invalid value, open the observed calendar and choose the
year/month/day using its actual controls. Do not guess date-picker selectors.

Find file controls from a full interactive observation using
`page.refs.filter(r => r.inputType === 'file' || r.actions?.includes('upload'))`.
Return these candidates with ref/name/locator and retain the page on `session`.
Continue `page.nextObservation` when needed before concluding absence. Names
such as "Select file" or "选择文件" depend on browser locale; a nearby "Picture"
heading need not label the input. Do not guess role `input` or a translated name.
If several file inputs exist, choose the intended one using observed context.

For an addressed file input, `upload` selects files without opening an OS chooser;
it does not submit the form. Use an actual existing path supplied or created with
authorized file tools, not an invented path. After acknowledgement, observe the
selected filename; the file input's name may change and invalidate its old ref.
This also applies to `inspect()`: use `tab.query` with an already observed file
selector, or obtain a fresh interactive observation and choose the intended
file input's new ref. Do not retain the pre-upload ref for the final readback.
A later read failure does not mean the upload failed and does not justify a repeat.

If only a chooser trigger is available, capture `const before = await tab.events()`
before clicking, then inspect the receipt or call
`await tab.waitForEvent('fileChooser',{after:before.cursor})`. Stop
dependent browser input. Use the current desktop catalog to enumerate and bind
the actual related native dialog; never infer its identity from a title or use
page coordinates. Reobserve the original page after the chooser completes.

For a known control state, the current condition schema is:

```js
await session.tab.byRef(observedCityRef).waitFor({state: 'enabled', timeoutMs: 3000});
```

The wait cannot revive a stale ref. Disabled state is `ref.states.disabled`;
missing state is not proof of enabled state. `timeoutMs` alone is not a delay.
Wait only when a subsequent action needs that state. A completed one-shot
button may correctly remain disabled. Reuse the wait receipt's fresh
`conditionReadback` instead of taking another whole-page snapshot.

Use the condition table in the prepared browser quickstart; it reflects the
current provider. Cua supports positive text containment, URL checks, live
element states and exact control values. It cannot prove text absence or
hidden/detached elements from partial observations. `negate`/`not` are not
condition fields; do not drop or rename them to make a rejected check pass.
If the new status is not known, use an observed status/list container and
`region.expectChange({property:'text',timeoutMs:3000},()=>trigger())`. The SDK
captures the baseline before invoking the trigger once, awaits it, and returns
`{previous,current,state,actionReceipt}`. Text leaves can be replaced by updates.
Advanced `waitForChange` requires `from` captured before input; an after-input
baseline can miss an already completed change. Missing, redacted or stale
evidence cannot prove change. For an unfamiliar shape, read `tab.help('verify')`
once before using it; ordinary edits do not need repeated schema discovery.

Lightweight feedback uses observed CSS, without replacing current refs:

```js
return await session.tab.query(observedSelector, {
  attributes: ['placeholder', 'type', 'id'], limit: 20
});
```

The result has `elements`, `total`, `truncated`, `url`. Each element has current
text/value/checked/disabled/visible fields plus **requested** `attributes`, but no
action ref or locator. For input reuse an observe() ref or use findRef; do not
pass a query record to byRef/locator.
Keep enough evidence to make the next decision; return the readback itself.

Before submitting, inspect the selected form values at a useful checkpoint.
Submit once and read the actual confirmation. If a cell fails after earlier
writes, inspect the operation receipt and current page before any new write.
Do not replay an acknowledged upload or submit because a subsequent read failed.
