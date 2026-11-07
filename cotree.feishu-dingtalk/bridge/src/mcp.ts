import { existsSync } from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Bridge } from "./bridge.js";
import { createAdapter } from "./adapters.js";
import { BridgeError, object, readConfig, readSecrets, safeError, saveConfig, string } from "./config.js";
import { CoTreeClient } from "./cotree-client.js";

const empty = { type: "object" as const, properties: {}, additionalProperties: false };
const id = { type: "string" as const, minLength: 1, maxLength: 256 };
export const toolDefinitions = [
  { name: "messaging_status", description: "查看飞书/钉钉桥接运行状态、队列和需要核查的回复，不返回密钥或聊天正文。", inputSchema: empty, annotations: { readOnlyHint: true } },
  { name: "messaging_configure", description: "保存非敏感机器人配置。须先停止桥接；配置仅填写凭据环境变量名，密钥由用户在插件配置面板或私有凭据文件填写。allowUsers 使用精确用户 ID，空列表拒绝所有人。", inputSchema: { type: "object" as const, properties: { config: { type: "object" as const } }, required: ["config"], additionalProperties: false } },
  { name: "messaging_workspaces", description: "列出来源 Key 可见的 CoTree 工作区，用于选择配置中的 workspaceId。", inputSchema: empty, annotations: { readOnlyHint: true } },
  { name: "messaging_start", description: "启动已配置的飞书长连接/钉钉 Stream 接收及结果回传。允许列表中的文本消息将提交给 CoTree；需用户明确启用接入。", inputSchema: empty },
  { name: "messaging_stop", description: "停止本桥接进程的消息接收和回传，保留投递收据。不会取消 CoTree 已受理任务。", inputSchema: empty },
  { name: "messaging_retry_input", description: "在修复配置或来源权限后重试待处理消息，复用已保存的原始正文和请求 ID。", inputSchema: { type: "object" as const, properties: { id }, required: ["id"], additionalProperties: false } },
  { name: "messaging_retry_delivery", description: "人工确认后重试发送结果未知的回复，可能造成重复消息。先查看 status，并取得用户明确重发指示。", inputSchema: { type: "object" as const, properties: { id, acceptDuplicateRisk: { const: true } }, required: ["id", "acceptDuplicateRisk"], additionalProperties: false } },
  { name: "messaging_reply", description: "向已接收消息的原始聊天发送补充回复。messageId 使用 status 的收据 ID；requestId 必须稳定，重试保持相同正文。仅在用户要求发送时使用。", inputSchema: { type: "object" as const, properties: { messageId: id, requestId: id, text: { type: "string" as const, minLength: 1, maxLength: 32000 } }, required: ["messageId", "requestId", "text"], additionalProperties: false } }
];

export function createMcpServer(file: string, bridge = new Bridge(file, createAdapter)) {
  const server = new Server({ name: "cotree-feishu-dingtalk", version: "0.1.0" }, { capabilities: { tools: {} } });
  // Serialize control calls so configure, start and stop cannot race.
  let control = Promise.resolve<unknown>(undefined);
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));
  server.setRequestHandler(CallToolRequestSchema, request => {
    const execute = async () => {
      try {
        const args = object(request.params.arguments ?? {}), name = request.params.name;
        const definition = toolDefinitions.find(tool => tool.name === name);
        if (!definition || Object.keys(args).some(key => !(key in definition.inputSchema.properties))) throw new BridgeError("INVALID_TOOL_ARGUMENTS");
        let result: unknown;
        switch (name) {
          case "messaging_status": result = bridge.status(); break;
          case "messaging_start": result = await bridge.start(); break;
          case "messaging_stop": result = await bridge.stop(); break;
          case "messaging_configure":
            if (bridge.running || existsSync(path.join(path.dirname(file), "state", "bridge.lock"))) throw new BridgeError("STOP_BRIDGE_BEFORE_CONFIGURE");
            saveConfig(file, args.config); result = { saved: true, configPath: file }; break;
          case "messaging_workspaces": {
            const config = readConfig(file), secrets = readSecrets(file, config, false);
            result = await new CoTreeClient(config, secrets[config.tokenEnv]!).workspaces(new AbortController().signal); break;
          }
          case "messaging_retry_input": result = bridge.retryInput(string(args.id, "id")); break;
          case "messaging_retry_delivery":
            if (args.acceptDuplicateRisk !== true) throw new BridgeError("DELIVERY_CONFIRMATION_REQUIRED");
            result = bridge.retryDelivery(string(args.id, "id")); break;
          case "messaging_reply": result = bridge.reply(string(args.messageId, "messageId"), string(args.text, "text", 32000), string(args.requestId, "requestId")); break;
          default: throw new BridgeError("UNKNOWN_TOOL");
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ code: safeError(error), ...(error instanceof BridgeError ? { message: error.message } : {}) }) }] };
      }
    };
    const next = control.then(execute, execute); control = next; return next;
  });
  return { server, bridge };
}
export async function runMcp(file: string) {
  const { server, bridge } = createMcpServer(file);
  let closing = false;
  const close = async () => { if (closing) return; closing = true; await bridge.stop(); await server.close(); };
  server.onclose = () => { void close(); };
  process.once("SIGINT", () => { void close(); }); process.once("SIGTERM", () => { void close(); });
  process.stdin.once("end", () => { void close(); });
  await server.connect(new StdioServerTransport());
}
