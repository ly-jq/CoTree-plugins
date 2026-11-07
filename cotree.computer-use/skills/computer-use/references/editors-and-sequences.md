# Editors and repeated input

## Bulk text, table content and readable delivery

When an editor accepts range paste, select its starting cell/range and use one
`await session.tab.pasteTable(expectedRows)` rather than walking every cell through
the name box and formula bar. Rows must be a rectangular array of strings; tabs,
quoted multiline cells and punctuation are preserved. `tab.paste(text,{ref?})`
also supports ordinary editor text. These operations use the system clipboard and
Chromium's native editing commands on the bound tab.

For caret insertion, `tab.insertText(text,{ref})` uses an observed editable target.
Without a ref it can resolve a fresh, unique focused editable control; ambiguous
focus is refused. `await tab.focusedElement()` returns its current ref and identity.
It cannot turn an unfocused Canvas grid into a semantic textbox. Use a selected
range's paste capability when that is the editor's actual input mechanism.

At a useful checkpoint, select the full requested range and read actual content:

```js
const actual = await session.tab.copyTable(); // {rows, text, source}
const matches = JSON.stringify(actual.rows) === JSON.stringify(expectedRows);
return {matches, expected: expectedRows, actual: actual.rows, source: actual.source};
```

`copyText()` returns freshly copied selected text. A failed or unacknowledged copy
never substitutes unrelated old clipboard contents. Copy never refocuses a ref:
select the requested content before copying. A loop's `ok:true` counter and input
acknowledgement do not establish cell values. Check all requested fields,
including punctuation, against readback. Report missing evidence explicitly;
the main model chooses task completion. Clipboard content is not proof of cloud
synchronization: use the application's observed saved state when relevant.

Prefer known state conditions or immediate targeted reads to fixed sleeps before
every input. Run known sequences in a cell and observe at meaningful boundaries.
Read `openedTabs` / `observationTarget` from a click receipt and bind that child;
the original handle stays attached to the opener. Native addressed observations retain unchanged refs; derive newly changed targets
from the returned page. Lightweight `query` and pure screenshots preserve refs. Public method discovery uses `insertText`,
`fill`, `paste`, `copyTable`; `typeText` is an internal action kind.

For a table with long text, consider observed formatting controls for wrapping,
column width and an unobstructed view. Choose formatting appropriate to the user
request; it is not a forced acceptance rule. Keep content readback distinct from
visual layout evidence and from application saving.


## Run known work locally

Do not ask the model to decide every step of a known sequence. Keep a bounded loop
inside one ControlScript cell, await input in order, and return at a meaningful
state change, elapsed-time budget or failure. Combine DOM feedback in one query:

```js
const hud = await session.tab.query('#hpText,#waveText,#leftText,#scoreText');
return hud;
```

Read the current `sequence` schema before constructing steps. A pointer move step
is `type: 'move'`, not `hover`. Holds belong inside one sequence; its completion or
cancellation releases held keys and buttons. For example, after a screenshot has
been delivered and the canvas selector has been observed:

```js
return await session.tab.sequence([
  {type: 'move', selector: 'canvas'},
  {type: 'keyDown', key: 'Space'},
  {type: 'wait', ms: 500},
  {type: 'keyUp', key: 'Space'}
]);
```

Use feedback to adapt each chunk and stop on the task's actual condition. For a
locally developed app, a declared testing interface can supply structured state
when the task authorizes it and the current Driver exposes it. Identify this as
application feedback, not visual perception. Keep real mouse/keyboard execution
on the bound tab. Without such feedback, unfamiliar Canvas states need a fresh
image and another model decision; JavaScript cannot inspect an image merely by
receiving its artifact ID.

