import { buildPluginToolName } from "@cotree/plugin-sdk";
import { TEAM } from "./coordination.js";
import { CAPTURE_ACTIONS, NETWORK_ACTIONS } from "./capture.js";
import { PROJECT_SCRIPTS } from "./execution.js";
import { PLUGIN_ID } from "./shared.js";

const str = { type: "string", minLength: 1, maxLength: 8000 };
const projectPath = { type: "string", minLength: 1, maxLength: 512, description: "Workspace-relative project directory; defaults to ." };
const requestKey = { type: "string", minLength: 1, maxLength: 200 };
const request = { type: "object", additionalProperties: true };
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const actions = (...values: string[]) => ({ type: "string", enum: values });
const files = [{ name: "file.read" }, { name: "file.write" }];
const process = [{ name: "file.read" }, { name: "process.exec" }];
// Helpers only write these product assets / starter files. Actual implementation
// edits remain owned by the main model and its original workspace tools.
const writePaths = ["app-studio.json", "docs/product/**", "package.json", "README.md", ".gitignore", "apps/api/server.mjs", "apps/web/index.html", "apps/admin/index.html", "packages/contracts/openapi.json", "tests/shell.test.mjs"]
  .flatMap(name => [name, `**/${name}`]);
const skillDescriptions: Record<string, string> = {
  "app-studio": "从一句需求持续完成用户端、业务后端、管理端、联调与交付，充分使用原 Group Session。",
  "reference-research": "研究参考软件的业务流程、角色、异常和可复用能力，保留来源与覆盖。",
  "api-capture": "录制网页操作并抓取请求/响应，导入HAR，关联业务动作与接口证据。",
  "code-resource-analysis": "分析源码、源映射、编译包或已有逆向代码，提炼规则、协议、测试向量与复用建议。",
  "business-model": "将目标、产品行为、API录制和代码证据转为业务规则、状态、角色与权限。",
  "contract-design": "统一三端接口、错误、校验、身份、数据和场景契约，协调精确版本。",
  "backend-build": "实现业务后端、持久化、服务端权限、状态转换、事务与API测试。",
  "customer-web-build": "实现用户端真实业务旅程、表单、加载/空/错误状态与API接入。",
  "admin-web-build": "实现管理端处理、权限、数据范围、运营操作与审计流程。",
  "integrate-verify": "集成精确成员产物，验证真实跨端流程，回派原成员修复并交付证据。"
};
const tool = (name: string, description: string, inputSchema: unknown, permissions: unknown[] = files) => ({ name, description, inputSchema,
  permissions, riskLevel: "medium", idempotent: false, requiresApproval: false, timeoutMs: name === "run" ? 290000 : 30000,
  resultBudget: { maxInlineBytes: 65536, overflow: "artifact" } });
export function createManifest() {
  return {
    manifestVersion: 4, sdk: { apiVersion: 1, requiredCapabilities: ["files.read", "files.write", "files.list", "tools.call", "artifacts.create", "sessions.invoke", "tasks.submit", "tasks.read", "tasks.cancel", "process.execute"] },
    id: PLUGIN_ID, name: "全栈应用开发", version: "0.1.0",
    description: "一句需求启动 Group 全栈开发：参考研究、接口录制、代码资源分析、业务契约、用户端/后端/管理端、真实联调与交付。",
    minKernelVersion: "0.1.319", entry: "dist/index.mjs",
    presentation: { icon: "assets/icon.svg", readme: "README.md" },
    execution: { runtime: "node", abi: "cotree.plugin.tool.v2", isolation: "brokered-process",
      resources: { wallTimeMs: 300000, memoryMb: 192, maxCapabilityRequests: 256, maxConcurrentCapabilities: 4,
        maxCapabilityOutputBytes: 4194304, maxFileBytes: 1048576, maxStdoutBytes: 4194304, maxStorageBytes: 65536 } },
    capabilities: { tools: true, skills: true, agents: true, services: true, evals: true },
    permissions: { filesystem: { read: ["."], write: writePaths }, shell: "none", browser: "none",
      tools: ["SessionQuery", "SessionDelegate", "SessionMessage", "SessionControl", "SessionWorktree", "BrowserApi", "BrowserDevtools", buildPluginToolName(PLUGIN_ID, "run")],
      artifacts: ["create", "read"], tasks: ["submit", "read", "wait", "cancel", "progress"],
      nativeExecutables: ["node"], processEnvironment: ["PORT", "HOST"], services: ["preview"], hostCapabilities: ["tool.capability"] },
    nativeExecutables: [{ id: "node", source: "system", command: "node", argumentPolicy: { mode: "exact", allowed: PROJECT_SCRIPTS.map(script => ["--run", script]) } }],
    services: [{ id: "preview", entry: "dist/service.mjs", runtime: "node", protocol: "cotree.plugin.service.v1", idleTimeoutMs: 3600000,
      hostCapabilities: ["tool.capability"], resources: { memoryMb: 128, maxPendingCalls: 8, maxEventBytes: 65536 } }],
    tools: [
      tool("start", "Prepare an application from a one-sentence goal in the current Session. Returns project assets, host Group capabilities and role templates; the main model must continue delegation, implementation and real verification. Existing files are never overwritten.", schema({ goal: { ...str, maxLength: 16000 }, projectPath, name: str, scaffold: { type: "boolean" } }, ["goal"])),
      tool("project", "Initialize product assets or a dependency-free Node web/admin/API starter; inspect product specs and delivery snapshots. Existing projects are preserved.", schema({ action: actions("initialize", "scaffold", "inspect"), goal: str, projectPath, name: str }, ["action"])),
      tool("coordinate", "Typed adapter to ORIGINAL Session query/delegate/message/control/worktree. Use original refs and request schemas. Continue existing members for fixes. Host validates authority, dependencies, revisions and replay; no separate scheduler.", schema({ action: actions("query", "delegate", "message", "control", "worktree"), request, requestKey }, ["action"]), []),
      tool("references", "Record source provenance and a file hash, inventory authorized code/resources, or inspect a version-3 source map in bounded pages. Does not execute source or certify inferred business rules.", schema({ action: actions("record", "inventory", "source-map"), projectPath, path: projectPath, id: str, source: request, notes: str, offset: { type: "integer", minimum: 0 } }, ["action"])),
      tool("capture", "Capture business interactions through original BrowserApi recording and BrowserDevtools network reads, or import HAR structure without header/body values. request contains original input fields. capture.start/mark/pause/resume/stop REQUIRE a stable request.requestId (letters/digits/-/_, max128); reuse only for the identical command. Use observed targets and immutable refs; never replay writes to collect a body.", schema({ action: actions(...CAPTURE_ACTIONS, ...NETWORK_ACTIONS, "import-har"), request, path: projectPath, offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 100 } }, ["action"]), [{ name: "file.read" }, { name: "tools.call" }]),
      tool("contract", "Check a JSON OpenAPI 3 contract's local references, operation IDs and product rule/journey links. Returns actual diagnostics and an artifact; not a full standard validator or business certification.", schema({ projectPath, path: projectPath, specPath: projectPath }), [{ name: "file.read" }]),
      { ...tool("environment", "Start/read/stop declared project dev/preview scripts through the original Service and ManagedProcessManager. Copy processId/cursors from receipts; admission is not readiness. Preview expires with service/host lifetime.", schema({ action: actions("inspect", "start", "list", "read", "stop"), projectPath, script: actions(...PROJECT_SCRIPTS), requestKey,
        processId: str, port: { type: "integer", minimum: 1024, maximum: 65535 }, cursor: request, maxBytes: { type: "integer", minimum: 1024, maximum: 65536 } }, ["action"]), process), service: { id: "preview", method: "environment" } },
      tool("journey", "Submit/read/cancel original host Tasks running declared build/test/migration scripts. Inspect retained output and test coverage; successful submission or exit alone does not prove an application works.", schema({ action: actions("start", "read", "list", "events", "cancel"), projectPath, script: actions(...PROJECT_SCRIPTS), requestKey, taskRef: str,
        timeoutMs: { type: "integer", minimum: 1000, maximum: 240000 }, afterSeq: { type: "integer", minimum: 0 } }, ["action"]), process),
      tool("run", "Finite project script executor used by Journey.start. Runs node --run with declared arguments through the original managed process owner; returns exact exit/log evidence and an artifact.", schema({ projectPath, script: actions(...PROJECT_SCRIPTS), requestKey, timeoutMs: { type: "integer", minimum: 1000, maximum: 240000 } }, ["script", "requestKey"]), process),
      tool("delivery", "Create a delivery snapshot from the coordinator assessment and original Task observations. Keep scope, versions, URLs, startup instructions and remaining work in assessment. Does not certify model claims.", schema({ projectPath, assessment: request, taskRefs: { type: "array", items: str, maxItems: 24 } }, ["assessment"]))
    ],
    skills: Object.entries(skillDescriptions).map(([name, description]) => ({ name: `${PLUGIN_ID}.${name}`, description, path: `skills/${name}/SKILL.md`, disableModelInvocation: false })),
    agents: TEAM.map(member => ({ name: `${PLUGIN_ID}.${member.role}`, family: member.family, description: member.responsibility,
      templateRole: member.role === "lead" ? "planner" : member.role === "integrator" ? "verifier" : ["business", "resource-analyst"].includes(member.role) ? "researcher" : "implementer",
      toolMode: "all", recommendedSkills: [`${PLUGIN_ID}.${member.skill}`],
      systemPrompt: `You are the App Studio ${member.role}. ${member.responsibility} Load the skill ${PLUGIN_ID}.${member.skill} and the exact product/contract/evidence references in your assignment. Use the existing CoTree tools, permission ceiling and Group; inherited models remain unchanged. Own only your assigned files and publish contract changes to their owner. Reports include actual artifact versions, checks and missing evidence; do not invent results. Continue authorized work through implementation and verification; a plan or initialized scaffold is not delivery. Respect current user steering and cancellation. Report completed work to your parent instead of waiting for mutual acknowledgement.` })),
    evals: ["evals/smoke.json"], integrity: { algorithm: "sha256", digest: "0".repeat(64) }
  };
}
