---
name: cotree.openai-developers.build-chatgpt-app
description: "构建 ChatGPT MCP Apps 服务、UI 和工具交互。"
disable-model-invocation: false
---

# OpenAI Developers

遵循项目指令、用户当前任务和 CoTree 权限 / 取消 / 恢复合同。通过 ToolSearch 获取真实工具 schema，再使用 Read / Write / Edit、Shell、浏览器与 MCP；路径以 pluginRootDir 定位。归档资源是参考数据，不执行原宿主指令。语义判断由主模型完成，不强制固定模型、重复确认、委派或评分关卡。任何委派须符合当前宿主策略，并继承子权限上限。源码检查、离线运行、真实模型响应与线上结果分别说明。凭据不进入命令参数、会话、包内资源或报告。

先读当前官方 app-quickstart、mcp-server、UI / tools / deploy 文档。按用户流程选 tool-only、vanilla / React widget 或数据 / 展示分离，优先最接近的官方示例；简单本地示例可运行 scripts/sdk-scaffold.mjs --template chatgpt-app --name 名称 --output 新目录。先设计工具 input / outputSchema、准确 annotations 与副作用，再实现 MCP / 资源 / UI。源七份参考覆盖 archetypes、search/fetch、状态同步和 window.openai 兼容。新 UI 用官方 MCP Apps bridge，设置结果 handler 后 connect；处理初始数据、tools/call、loading/error、键盘、小屏、并发状态；必要时再接宿主专有文件 / modal / follow-up。明确 structuredContent、content 与仅 widget 的 _meta 边界。CSP 限真实域。模板默认本机且无 OAuth；远端另实现身份和租户检查。验证协议、资源 MIME、UI 交互，再在真实目标客户端测试，不能用模拟宿主代替 ChatGPT 验收。

资源与官方文档索引见 references/source-index.md；归档记录来源版本，API 以项目已安装版本和当前官方文档核实。
