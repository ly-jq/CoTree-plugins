# CoTree 插件合同速查

根 plugin.json 使用 manifestVersion: 3，稳定 id、name、version、description、minKernelVersion、entry、capabilities 与 permissions。不要继承 .claude-plugin / .codex-plugin 清单。当前校验器优先于模板；开发者在 CoTree 源码中可查 docs/plugin-sdk-manual 与 packages/plugins/src/manifest.ts，独立安装时以宿主可用 SDK / 工具 schema 为准。

## 组件

- Skill：skills[].name / description / path 指向包内 SKILL.md；资源由 skillDir / pluginRootDir 定位，disableModelInvocation 控制自动选择，不代替权限。只有需显式调用的产品入口才设置它。
- Agent：agents[].name / description / systemPrompt 或 path / tools；不固定上游供应商模型。工具与能力必须真实存在。
- MCP：mcpServers[]，stdio command / args / env / cwd / cwdBase，远程 transport / url / headersEnv；包不存令牌。插件没有自动浏览器 OAuth 登录。
- Hook：hooks 的合法键为 preToolUse、postToolUse、sessionStart、sessionEnd、runCreated、runCompleted；lifecycleHooks 的 target 为 run_created、session_start、tool_lifecycle、run_completed。每个 hooks 列表对应可加载资源，模式、载荷与权限按当前 SDK 核对，不能搬用其他宿主的 shell JSON。
- 代码工具：execution.runtime=node、abi=cotree.plugin.tool.v2、isolation=brokered-process；tools[].name 对应导出 tools 中同名函数。返回有限 JSON 的 {ok,output,error,summary}，网络 / 文件 / 存储经受控 Capability Clients。自身依赖 bundle 为自包含 .mjs，宿主不替包 npm install。
- UI：新界面为 v3 ui.views + cotree.plugin-ui.v1，入口在包内，SDK UI 窄桥不直接访问宿主文件或秘密。沿用当前信任与权限，不把声明式历史 UI 当默认新架构。

## 验证入口

已安装 CoTree 可运行 cotree plugin validate <plugin.json> --json；仓库入口为 pnpm exec tsx apps/cli/src/main.ts plugin validate <plugin.json> --json。先编译代码再核对注册路径与导出，随后在独立 workspace 用 plugin install / enable / tool-exec / disable 验证。具体选项以当前 CLI help 为准，记录实际路径与摘要。PluginValidate 是提案验证，要求真实 proposalId，不接受任意目录。

本包脚手架没有网络、Shell、存储权限，不安装输出。扩大能力时同时修改 manifest 与实现，通过现有权限与信任流程。包内容改变后重新计算摘要，不能携带旧签名发布。可选 eval 是诊断，不能强制替代主模型完成判断。
