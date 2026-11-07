import { groupCapture, actionLabel, type CaptureEvent, type Step, type WorkflowEdit } from "./workflow-model.js";

type Capture = { id: string; title: string; state: string; reason?: string; persistent: boolean; sequence: number; durableSeq: number; counts?: { actions: number; requests: number }; storageError?: string };
type Workflow = { revision: string; digest: string; data: { workflowId: string; captureId: string; title: string; edits: WorkflowEdit[]; variables: { name: string; description: string }[]; expectedOutput: string; throughSequence: number } };
type Target = { sessionId: string; tabId: string; profile: string; title: string; url: string; ready: boolean; busy: boolean; capture?: Capture };
type Reference = { resourceId: string; revision: string; digest: string; label: string; summary: string; input: Record<string, string> };
type Options = { root: HTMLElement; command<T>(input: Record<string, unknown>): Promise<T>; host<T>(id: string, input?: Record<string, unknown>): Promise<T>; notice(message: string, error?: boolean): void };

export function createWorkflowPanel({ root, command, host, notice }: Options) {
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
  };
  const button = (text: string, action: () => void) => { const node = element("button", text, "cotree-button"); node.type = "button"; node.onclick = action; return node; };
  const input = (placeholder: string, value = "") => { const node = element("input", undefined, "cotree-input"); node.placeholder = placeholder; node.setAttribute("aria-label", placeholder); node.value = value; return node; };
  const row = (...children: Node[]) => { const node = element("div", undefined, "row wrap"); node.append(...children); return node; };
  const select = (label: string, choices: { value: string; text: string }[]) => {
    const node = element("select", undefined, "cotree-select"); node.setAttribute("aria-label", label);
    for (const choice of choices) { const option = element("option", choice.text); option.value = choice.value; node.append(option); } return node;
  };
  let ready = false, busy = false, shown = false, capture: Capture | undefined, targets: Target[] = [], events: CaptureEvent[] = [], cursor = 0, more = false;
  let hostVisible = false, refreshPending = false, targetFailures = 0, refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let targetRefresh: Promise<void> | undefined;
  let edits: WorkflowEdit[] = [], saved: Workflow | undefined, selectedStep: string | undefined, requestLimit = 30, pageLimit = 30, draftDirty = false;
  let captures: Capture[] = [], nextCaptureOffset: number | undefined, cardHandoff = true;
  const references = new Map<string, Reference>();
  const checked = new Set<string>(); let selectionMode: "steps" | "requests" = "steps";
  const title = input("流程名称"), expectation = element("textarea", undefined, "cotree-textarea"); expectation.placeholder = "希望完成后的页面状态或输出"; expectation.setAttribute("aria-label", "期望结果");
  const variables = element("textarea", undefined, "cotree-textarea"); variables.placeholder = "每行一个变量：名称=用途，例如 customer=本次查询客户"; variables.setAttribute("aria-label", "流程变量");
  for (const field of [title, expectation, variables]) field.oninput = () => { draftDirty = true; };
  const targetSelect = select("选择要录制的标签页", [{ value: "", text: "正在加载浏览器标签…" }]), capturesSelect = select("选择已有录制", []);
  const targetStatus = element("p", "", "muted"); targetStatus.id = "recording-target-status"; targetStatus.setAttribute("role", "status");
  targetSelect.setAttribute("aria-describedby", targetStatus.id);
  const targetKey = (target: Target) => JSON.stringify([target.sessionId, target.tabId]);
  const canRecord = (target: Target | undefined) => !!target && target.ready && !target.busy && !target.capture;
  const selectedTarget = () => targets.find(target => targetKey(target) === targetSelect.value);
  targetSelect.onchange = () => controls();
  const search = input("搜索已加载步骤或接口"); search.oninput = () => render();
  const status = element("p", "正在检查录制能力…", "muted");
  const list = element("div"), detail = element("section", undefined, "workflow-detail"), revisions = element("div"), footer = element("p", undefined, "muted");
  const start = button("开始录制", () => void run(async () => {
    if (!discardEdits()) return;
    const target = selectedTarget(); if (!target || !canRecord(target)) throw new Error("请先选择就绪的内置浏览器标签。");
    await choose(await command<Capture>({ action: "capture.start", sessionId: target.sessionId, tabId: target.tabId, title: title.value || "操作流程", requestId: crypto.randomUUID() }));
    notice("正在录制所选标签。可以操作网页；浏览器顶部可随时暂停或结束。");
  }));
  const pause = button("暂停", () => void manage(capture?.state === "paused" ? "capture.resume" : "capture.pause"));
  const stop = button("结束并保存录制", () => void manage("capture.stop"));
  const markTitle = input("手动步骤名称"); markTitle.maxLength = 200;
  const mark = (boundary: string) => void run(async () => { if (capture) { await command({ action: "capture.mark", captureId: capture.id, label: markTitle.value || "步骤", boundary, requestId: crypto.randomUUID() }); await read(); } });
  const refreshButton = button("刷新记录", () => void run(async () => { await refresh(); if (capture) await read(); }));
  const refreshTargetsButton = button("刷新标签页", () => void run(refreshTargets));
  const moreButton = button("加载后续事件", () => void run(read));
  const save = button("保存流程版本", () => void run(async () => { saved = await command<Workflow>({ action: "workflow.save", ...definition() }); draftDirty = false; notice("已保存固定版本；其他窗口的版本和旧附件均保留。"); await listVersions(); }));
  const retry = button("重试保存录制", () => void run(async () => { if (capture) { capture = await command<Capture>({ action: "capture.retain", captureId: capture.id }); await read(); } }));
  const moreCaptures = button("加载更多录制", () => void run(async () => { if (nextCaptureOffset !== undefined) await listCaptures(nextCaptureOffset); }));
  const attachAll = button("附加整个流程", () => void attach("workflow"));
  const attachSelected = button("附加所选", () => void attach(selectionMode));
  const mode = select("选择类型", [{ value: "steps", text: "选择步骤" }, { value: "requests", text: "选择接口请求" }]);
  mode.onchange = () => { selectionMode = mode.value as typeof selectionMode; checked.clear(); render(); };
  const toggleAll = button("选择当前已显示项", () => {
    for (const step of displayedSteps().slice(0, pageLimit)) {
      if (selectionMode === "steps") checked.add(step.id); else if (!step.hidden) for (const request of step.requests.slice(0, requestLimit)) checked.add(request.requestId!);
    }
    render();
  });
  const deleteCapture = button("删除这份录制", () => void run(async () => {
    if (!capture || !confirm("删除这份录制后，引用它的流程和历史附件将无法读取。确认删除？")) return;
    await command({ action: "capture.delete", captureId: capture.id }); capture = undefined; events = []; await refresh(); render();
  }));
  capturesSelect.onchange = () => void run(async () => {
    if (!capturesSelect.value || !discardEdits()) { capturesSelect.value = capture?.id || ""; return; }
    const item = captures.find(item => item.id === capturesSelect.value);
    await choose(item?.state === "unavailable" ? item : await command<Capture>({ action: "capture.status", captureId: capturesSelect.value }));
  });
  const recordingControls = element("details"); recordingControls.open = true;
  const manualStep = element("details"); manualStep.append(element("summary", "手动标记步骤"), row(markTitle, button("开始步骤", () => mark("start")), button("结束步骤", () => mark("end"))));
  recordingControls.append(element("summary", "录制控制与历史记录"), row(targetSelect, refreshTargetsButton, start), targetStatus, row(capturesSelect, refreshButton, moreCaptures), row(pause, stop, retry), manualStep);
  const settings = element("details"); settings.append(element("summary", "流程名称、变量与完成条件"), title, variables, expectation, save);
  const history = element("details"); history.append(element("summary", "固定版本与清理"), revisions, deleteCapture);
  const handoff = row(attachSelected, attachAll); handoff.classList.add("workflow-handoff");
  root.append(element("p", "录制一个标签的操作，按步骤选择接口，再附加到对话。流程保存在当前工作目录。", "muted"), status,
    recordingControls, settings, search, row(mode, toggleAll, button("清空选择", () => { checked.clear(); render(); })), handoff, list, moreButton, detail, footer, history);

  function controls() {
    root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input,button,select,textarea").forEach(node => node.disabled = busy || !ready);
    start.disabled = busy || !ready || !canRecord(selectedTarget());
    targetSelect.disabled = busy || !ready || !targets.length;
    pause.disabled = busy || !capture || !(capture.state === "recording" || capture.state === "paused" && capture.reason === "user_paused");
    pause.textContent = capture?.state === "paused" ? "继续录制" : "暂停";
    stop.disabled = busy || !capture || !["starting", "recording", "paused"].includes(capture.state);
    const ended = capture && ["ended", "interrupted"].includes(capture.state);
    for (const node of [save, attachAll, attachSelected]) node.disabled = busy || !ended || !capture?.persistent;
    attachSelected.disabled ||= checked.size === 0;
    deleteCapture.disabled = busy || !(ended || capture?.state === "unavailable");
    retry.hidden = !capture?.storageError; retry.disabled = busy || !ended || !capture?.persistent;
    moreCaptures.hidden = nextCaptureOffset === undefined;
    moreButton.disabled = busy || !capture || !more;
    attachAll.textContent = cardHandoff ? "附加整个流程" : "以文本填入整个流程";
    attachSelected.textContent = cardHandoff ? "附加所选" : "以文本填入所选";
    footer.textContent = `${checked.size} 项已选择${more ? " · 尚有未加载事件，归组随后续事件补全" : ""}。${cardHandoff ? "附加只写入当前草稿" : "宿主不支持引用卡片，将填入明确的文本引用"}，由你发送后执行。`;
  }
  async function run(action: () => Promise<void>) {
    if (busy) return; busy = true; clearTimeout(refreshTimer); controls();
    try { await action(); } catch (error) { notice(error instanceof Error ? error.message : String(error), true); }
    finally {
      busy = false; controls();
      if (refreshPending && shown && hostVisible) void refreshPanel(); else scheduleRead();
    }
  }
  function scheduleRead() {
    clearTimeout(refreshTimer); refreshTimer = undefined;
    if (!shown || !hostVisible || !ready || busy) return;
    if (capture && ["starting", "recording", "paused", "stopping"].includes(capture.state)) refreshTimer = setTimeout(() => void run(read), 2000);
    else if (!targets.length || targets.some(target => !canRecord(target))) {
      // Only wait for changing availability; stable ready targets and hidden views do no work.
      refreshTimer = setTimeout(() => {
        // Discovery is read-only: keep selection usable while its request is in flight.
        void refreshTargets().catch(error => notice(error instanceof Error ? error.message : String(error), true)).finally(scheduleRead);
      }, Math.min(10000, 2000 * (targetFailures + 1)));
    }
  }
  async function refreshPanel() {
    if (busy) { refreshPending = true; return; }
    refreshPending = false;
    await run(async () => { await refresh(); if (capture) await read(); });
  }
  function refreshTargets() {
    return targetRefresh ??= loadTargets().finally(() => { targetRefresh = undefined; controls(); });
  }
  async function loadTargets() {
    try {
      const result = await command<{ targets: Target[] }>({ action: "capture.targets" }); targets = result.targets; targetFailures = 0;
    } catch (error) {
      targets = []; targetFailures++;
      const placeholder = element("option", "标签页读取失败，请重试"); placeholder.value = ""; targetSelect.replaceChildren(placeholder);
      targetStatus.textContent = `无法读取浏览器标签页：${error instanceof Error ? error.message : String(error)}。可点击“刷新标签页”重试。`;
      throw error;
    }
    const previous = targetSelect.value;
    const available = targets.some(canRecord);
    const options = targets.map(target => ({ value: targetKey(target), disabled: !canRecord(target),
      text: `${target.title || target.url || "空白页"} · ${target.profile === "managed" ? "默认浏览器" : target.profile}${target.capture ? " · 已在录制" : target.busy ? " · Agent 使用中" : !target.ready ? " · 等待页面或窗口就绪" : ""}` }));
    if (!available) options.unshift({ value: "", disabled: true, text: targets.length ? "标签页暂不可录制，请查看下方提示" : "尚无浏览器标签页，请先打开浏览器" });
    // Do not replace an unchanged native select while the user has its menu open.
    const current = Array.from(targetSelect.options, option => ({ value: option.value, disabled: option.disabled, text: option.textContent }));
    if (JSON.stringify(current) !== JSON.stringify(options)) targetSelect.replaceChildren(...options.map(choice => {
      const option = element("option", choice.text); option.value = choice.value; option.disabled = choice.disabled; return option;
    }));
    targetSelect.value = targets.some(target => targetKey(target) === previous && canRecord(target)) ? previous : targets.filter(canRecord).map(targetKey)[0] || "";
    targetStatus.textContent = !targets.length ? "当前工作目录没有打开的浏览器标签。点击右上角“打开浏览器”，打开网页后返回。"
      : !available ? "标签页尚未就绪、正由 Agent 使用或已有录制。请查看下拉列表中的原因；就绪后会自动更新。"
      : "选择要录制的标签，再点击“开始录制”。返回面板会自动更新，也可手动刷新标签页。";
  }
  async function refresh() {
    const available = await command<{ capture?: { version: number } }>({ action: "status" }); ready = available.capture?.version === 1;
    if (!ready) { status.textContent = "此宿主暂不支持操作录制，仍可使用全部接口。更新 CoTree 后启用。"; return; }
    await refreshTargets();
    await listCaptures();
    status.textContent = capture ? captureStatus(capture) : "录制仅覆盖所选标签主文档。密码、认证字段和响应正文不会进入流程。";
  }
  async function listCaptures(offset = 0) {
    const result = await command<{ captures: Capture[]; nextOffset?: number }>({ action: "capture.list", limit: 50, offset });
    captures = offset ? [...captures, ...result.captures.filter(item => !captures.some(prior => prior.id === item.id))] : result.captures;
    nextCaptureOffset = result.nextOffset;
    if (capture && !captures.some(item => item.id === capture?.id)) captures.push(capture);
    const placeholder = element("option", "选择已有录制"); placeholder.value = "";
    capturesSelect.replaceChildren(placeholder, ...captures.map(item => { const option = element("option", `${item.title || "无法读取的录制"} · ${stateLabel(item.state)}`); option.value = item.id; return option; }));
    capturesSelect.value = capture?.id || "";
  }
  function discardEdits() { return !draftDirty || confirm("尚未保存流程编辑，放弃这些编辑并切换？"); }
  function stateLabel(state: string) { return ({ starting: "准备中", recording: "录制中", paused: "暂停", stopping: "保存中", ended: "已结束", interrupted: "已中断", unavailable: "读取失败" } as Record<string, string>)[state] || `不支持的状态 ${state}`; }
  function captureStatus(value: Capture) { return `${stateLabel(value.state)} · ${value.counts?.actions ?? 0} 次操作 / ${value.counts?.requests ?? 0} 个请求 · ${value.persistent ? value.durableSeq === value.sequence ? "已加密保存" : "正在保存" : "仅内存，无法附加持久引用"}${value.reason ? ` · ${value.reason}` : ""}${value.storageError ? ` · ${value.storageError}` : ""}`; }
  async function choose(value: Capture) {
    capture = value; events = []; cursor = 0; more = true; edits = []; saved = undefined; selectedStep = undefined; checked.clear(); draftDirty = false; references.clear();
    recordingControls.open = ["starting", "recording", "paused"].includes(value.state);
    title.value = value.title || ""; expectation.value = ""; variables.value = ""; pageLimit = 30; requestLimit = 30;
    if (value.state === "unavailable") { more = false; revisions.replaceChildren(); render(); return; }
    await read(); await listVersions();
  }
  async function read() {
    if (!capture || capture.state === "unavailable") return;
    const page = await command<{ capture: Capture; events: CaptureEvent[]; nextCursor: number; hasMore: boolean }>({ action: "capture.read", captureId: capture.id, afterSequence: cursor, limit: 100 });
    if (["recording", "stopping", "paused"].includes(capture.state) && ["ended", "interrupted"].includes(page.capture.state)) recordingControls.open = false;
    capture = page.capture; events.push(...page.events); cursor = page.nextCursor; more = page.hasMore; render();
  }
  async function manage(action: string) { await run(async () => { if (capture) { capture = await command<Capture>({ action, captureId: capture.id, requestId: crypto.randomUUID() }); await read(); } }); }
  function definition() {
    if (!capture) throw new Error("请先选择一份录制。");
    return { captureId: capture.id, throughSequence: saved?.data.throughSequence || capture.sequence, workflowId: saved?.data.workflowId || capture.id,
      ...(saved ? { baseRevision: saved.revision } : {}), title: title.value || capture.title, edits,
      variables: variables.value.split("\n").filter(line => line.trim()).map(line => { const [name = "", ...rest] = line.split("="); return { name: name.trim(), description: rest.join("=").trim() }; }), expectedOutput: expectation.value };
  }
  function edit(value: WorkflowEdit) { edits.push(value); draftDirty = true; selectedStep = value.kind === "merge" ? value.targetId : value.stepId; render(); }
  function versionEvents() { return saved ? events.filter(event => event.sequence <= saved!.data.throughSequence) : events; }
  function displayedSteps(steps = groupCapture(versionEvents(), edits)) {
    const query = search.value.trim().toLocaleLowerCase();
    return query ? steps.filter(step => `${step.name} ${step.requests.map(request => `${request.method} ${request.url}`).join(" ")}`.toLocaleLowerCase().includes(query)) : steps;
  }
  function checkbox(id: string, name: string) { const node = element("input"); node.type = "checkbox"; node.checked = checked.has(id); node.setAttribute("aria-label", `选择 ${name}`); node.onchange = () => { if (node.checked) checked.add(id); else checked.delete(id); controls(); }; return node; }
  function render() {
    if (capture) status.textContent = captureStatus(capture);
    const steps = groupCapture(versionEvents(), edits); list.replaceChildren(); detail.replaceChildren();
    const displayed = displayedSteps(steps);
    const gaps = versionEvents().filter(event => event.kind === "gap" || event.type === "gap");
    if (gaps.length) list.append(element("p", `覆盖缺口：${[...new Set(gaps.map(event => event.reason))].join("、")}。这些区间不能保证完整复刻。`, "workflow-warning"));
    for (const step of displayed.slice(0, pageLimit)) {
      const open = button(`${step.name} · ${step.actions.length} 次操作 / ${step.requests.length} 个请求${step.hidden ? " · 已折叠" : ""}`, () => { selectedStep = step.id; render(); });
      const group = element("section", undefined, "workflow-step");
      group.append(row(...(selectionMode === "steps" ? [checkbox(step.id, step.name)] : []), open));
      group.append(element("small", step.association === "explicit_interval" ? "手动区间" : step.association === "edited" ? "手动整理" : step.association === "time_candidate" ? "时间接近的候选请求，未证明因果" : "可手动归入相关步骤", "muted"));
      if (!step.hidden) {
        for (const request of step.requests.slice(0, requestLimit)) {
          const text = `${request.method} ${request.url} · ${request.transferComplete === true ? `HTTP ${request.status}` : request.reason || "未观察到完整传输"}`;
          const inspect = button(text, () => void run(async () => {
            if (!request.sampleRef) throw new Error("这个请求没有可读取的固定样本。");
            const sample = await command<{ apiId?: string; profile?: string; replayable?: boolean }>({ action: "sample.get", sampleRef: request.sampleRef });
            const preview = element("pre", JSON.stringify(sample, null, 2)); preview.tabIndex = 0; detail.replaceChildren(element("h3", "当时的请求样本"), preview);
            if (sample.apiId && sample.replayable) detail.append(button("收藏接口，允许复用", () => void run(async () => {
              await command({ action: "update", id: sample.apiId, profile: sample.profile, patch: { favorite: true } }); notice("已收藏此接口。实际执行仍使用当前登录态和正常授权。");
            })));
          }));
          group.append(row(...(selectionMode === "requests" ? [checkbox(request.requestId!, text)] : []), inspect));
        }
        if (step.requests.length > requestLimit) group.append(button("显示更多请求", () => { requestLimit += 30; render(); }));
      }
      list.append(group);
    }
    if (displayed.length > pageLimit) list.append(button("显示更多步骤", () => { pageLimit += 30; render(); }));
    const step = steps.find(item => item.id === selectedStep); if (step) renderStep(step, steps); controls();
  }
  function renderStep(step: Step, steps: Step[]) {
    const name = input("步骤名称", step.name), expected = input("这一步的完成条件", step.expect || "");
    const destination = select("目标步骤", steps.filter(item => item.id !== step.id).map(item => ({ value: item.id, text: item.name })));
    detail.append(element("h3", "整理步骤"), name, expected, row(button("保存步骤说明", () => { edits.push({ kind: "rename", stepId: step.id, text: name.value }, { kind: "expect", stepId: step.id, text: expected.value }); draftDirty = true; render(); }), button(step.hidden ? "展开" : "折叠噪声", () => edit({ kind: "hide", stepId: step.id }))), destination,
      row(button("合并到目标步骤", () => edit({ kind: "merge", stepId: step.id, targetId: destination.value })), button("移到目标步骤前", () => edit({ kind: "move", stepId: step.id, targetId: destination.value }))));
    for (const action of step.actions) detail.append(row(element("span", `${actionLabel(action)}${action.omitted ? ` · 未记录值：${action.omitted}` : action.value !== undefined ? ` · ${action.value.slice(0, 100)}` : ""}`), button("从此处拆分", () => edit({ kind: "split", stepId: step.id, actionId: action.id }))));
    for (const request of step.requests.slice(0, requestLimit)) detail.append(row(element("span", `${request.method} ${request.url}`), button("归入目标步骤", () => edit({ kind: "assign", stepId: step.id, targetId: destination.value, requestId: request.requestId }))));
  }
  async function listVersions(offset = 0) {
    if (!offset) revisions.replaceChildren(); if (!capture) return;
    const result = await command<{ revisions: { workflowId: string; revision: string }[]; nextOffset?: number }>({ action: "workflow.list", workflowId: capture.id, offset });
    if (!result.revisions.length) return;
    const options = select("已保存版本（并发分支都保留）", result.revisions.map(item => ({ value: item.revision, text: `固定版本 ${item.revision.slice(0, 12)}` })));
    revisions.append(element("p", `${result.revisions.length} 个保存版本；旧附件始终引用原版本。`, "muted"), options, button("载入所选版本", () => void run(async () => {
      if (!capture || !discardEdits()) return; saved = await command<Workflow>({ action: "workflow.get", workflowId: capture.id, revision: options.value });
      edits = [...saved.data.edits]; title.value = saved.data.title; variables.value = saved.data.variables.map(item => `${item.name}=${item.description}`).join("\n"); expectation.value = saved.data.expectedOutput; draftDirty = false; checked.clear(); render();
    })), button("删除所选版本", () => void run(async () => {
      if (!capture || !confirm("删除这个固定版本后，引用它的旧附件将无法读取。确认删除？")) return;
      await command({ action: "workflow.delete", workflowId: capture.id, revision: options.value });
      if (saved?.revision === options.value) { saved = undefined; draftDirty = true; }
      references.clear(); await listVersions();
    })));
    if (result.nextOffset !== undefined) {
      const moreVersions = button("加载更多版本", () => void run(async () => { moreVersions.remove(); await listVersions(result.nextOffset); })); revisions.append(moreVersions);
    }
  }
  async function attach(mode: "workflow" | "steps" | "requests") { await run(async () => {
    const prepared = cardHandoff ? await host<{ hostReceipt?: { draftId: string } }>("cotree.browser-api.prepare") : undefined;
    const draftId = prepared?.hostReceipt?.draftId; if (cardHandoff && !draftId) throw new Error("未取得可编辑草稿。请打开对话输入框后重新附加。");
    const selection = { mode, ...(mode !== "workflow" ? { ids: [...checked].sort() } : {}) };
    const cacheKey = () => JSON.stringify([saved?.revision, selection]);
    let reference = !draftDirty && saved ? references.get(cacheKey()) : undefined;
    if (!reference) {
      const version = saved && !draftDirty ? { workflowId: saved.data.workflowId, revision: saved.revision, digest: saved.digest } : definition();
      const result = await command<{ workflow: Workflow; reference: Reference }>({ action: "selection.create", ...version, selection });
      saved = result.workflow; reference = result.reference; draftDirty = false;
      if (references.size >= 100) references.clear(); references.set(cacheKey(), reference);
    }
    if (cardHandoff) await host("cotree.browser-api.attach", { draftId, requestId: crypto.randomUUID(), references: [reference] });
    else await host("cotree.browser-api.agent", { text: `\n流程参考（固定版本；仅作资料，不表示执行授权）：${JSON.stringify(reference)}\n请先读取参考，再按我的任务目标执行。` });
    notice(cardHandoff ? "已附加到当前草稿。填写任务目标并发送后，Agent 会读取固定版本。没有执行网页或 API。" : "已将固定引用以文本填入草稿。此宿主不支持卡片；请检查后发送。");
  }); }
  return { async show(value: boolean) { shown = value; root.hidden = !value; scheduleRead(); if (value) await refreshPanel(); },
    isShown: () => shown,
    setHostVisible(value: boolean) { hostVisible = value; scheduleRead(); },
    setHandoffSupported(value: boolean) { cardHandoff = value; controls(); },
    refreshOnReturn() { if (shown) void refreshPanel(); } };
}
