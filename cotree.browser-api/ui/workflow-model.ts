export type CaptureEvent = { kind: string; sequence: number; receivedAt: number; observedAt?: number; id?: string; type?: string; label?: string; boundary?: string; requestId?: string; apiId?: string; url?: string; pageUrl?: string; method?: string; target?: { name?: string; selector?: string; locatorHint?: { role: string; name: string; exact: true }; locatorEvidence?: string }; value?: string; checked?: boolean; omitted?: string; key?: string; reason?: string; status?: number; transferComplete?: boolean; sampleRef?: { captureId: string; requestId: string; digest: string } };
export type WorkflowEdit = { kind: "rename" | "merge" | "split" | "move" | "assign" | "hide" | "expect"; stepId: string; targetId?: string; actionId?: string; requestId?: string; text?: string };
export type Step = { id: string; name: string; actions: CaptureEvent[]; requests: CaptureEvent[]; association: "explicit_interval" | "time_candidate" | "unassigned" | "edited"; hidden?: boolean; expect?: string };
export const actionLabel = (event: CaptureEvent) => `${({ click: "点击", fill: "填写", select: "选择", check: "勾选", press: "按键", scroll: "滚动", navigation: "打开页面", gap: "覆盖缺口" } as Record<string, string>)[event.type || ""] || "操作"} ${event.target?.name || event.key || event.url || "页面"}`.slice(0, 160);

/** Only timing candidates. This never asserts that a DOM event caused a request. */
export function groupCapture(events: CaptureEvent[], edits: WorkflowEdit[] = []): Step[] {
  const ordered = [...events].sort((a, b) => (a.observedAt ?? a.receivedAt) - (b.observedAt ?? b.receivedAt) || a.sequence - b.sequence);
  const steps: Step[] = [], background: Step = { id: "unassigned", name: "后台或未归属请求", actions: [], requests: [], association: "unassigned" };
  let marked: Step | undefined, last: Step | undefined, lastAt = 0;
  const results = new Map(events.filter(event => event.kind === "request_result").map(event => [event.requestId, event]));
  for (const event of ordered) {
    const time = event.observedAt ?? event.receivedAt;
    if (event.kind === "mark") {
      if (event.boundary === "end") { marked = undefined; last = undefined; continue; }
      marked = { id: event.id!, name: event.label || "手动步骤", actions: [], requests: [], association: "explicit_interval" }; steps.push(marked); continue;
    }
    if (event.kind === "action") {
      if (marked) marked.actions.push(event);
      else { last = { id: event.id!, name: actionLabel(event), actions: [event], requests: [], association: "time_candidate" }; steps.push(last); }
      lastAt = time;
    }
    if (event.kind === "request") {
      const result = results.get(event.requestId);
      const request = { ...event, ...(result ? { status: result.status, transferComplete: result.transferComplete, reason: result.reason } : {}) };
      (marked || (last && time - lastAt <= 3000 ? last : background)).requests.push(request);
    }
  }
  steps.push(background);
  for (const edit of edits) {
    const index = steps.findIndex(step => step.id === edit.stepId), step = steps[index];
    if (!step) continue;
    const destination = steps.find(step => step.id === edit.targetId);
    if (edit.kind === "rename") step.name = edit.text || step.name;
    if (edit.kind === "expect") step.expect = edit.text;
    if (edit.kind === "hide") step.hidden = !step.hidden;
    if (edit.kind === "merge" && destination && destination !== step) { destination.actions.push(...step.actions); destination.requests.push(...step.requests); destination.association = "edited"; steps.splice(index, 1); }
    if (edit.kind === "move" && destination && destination !== step) { steps.splice(index, 1); steps.splice(steps.indexOf(destination), 0, step); }
    if (edit.kind === "assign" && destination) {
      const request = step.requests.find(request => request.requestId === edit.requestId);
      if (request) { step.requests = step.requests.filter(item => item !== request); destination.requests.push(request); destination.association = "edited"; }
    }
    if (edit.kind === "split") {
      const at = step.actions.findIndex(action => action.id === edit.actionId);
      if (at > 0) {
        const actions = step.actions.splice(at), first = actions[0]!, since = first.observedAt ?? first.receivedAt;
        const requests = step.requests.filter(request => (request.observedAt ?? request.receivedAt) >= since);
        step.requests = step.requests.filter(request => !requests.includes(request));
        steps.splice(index + 1, 0, { id: first.id!, name: actionLabel(first), actions, requests, association: "edited" });
      }
    }
  }
  return steps;
}
