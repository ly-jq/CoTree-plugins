# CoTree 插件合同速查

当前开发基线为 `@cotree/plugin-sdk@0.14.0`、API 1。版本指公开包的当前构建，不代表 npm 已发布。独立插件只依赖 `@cotree/plugin-sdk`、`/ui`、`/service`、`/provider` 和 `/theme.css`；不要导入宿主私有 core、Kernel、数据库或 Electron 模块。宿主执行校验优先于类型和本参考。

## 清单与能力发现

纯 Skill、Agent、MCP 声明仍可使用 Manifest v3，本作者包也属于这一类；不用为了 SDK 升级添加无用依赖或权限。使用通用 SDK 的新代码插件采用 Manifest v4，声明 `sdk.apiVersion: 1` 和实际需要的 `sdk.requiredCapabilities`。SDK 包版本、Manifest 版本、API 版本、Tool ABI 是不同概念。

例如使用文件读取的代码插件片段：

```json
{
  "manifestVersion": 4,
  "sdk": { "apiVersion": 1, "requiredCapabilities": ["files.read"] },
  "permissions": { "filesystem": { "read": ["reports/**"] } },
  "execution": { "runtime": "node", "abi": "cotree.plugin.tool.v2", "isolation": "brokered-process" }
}
```

这是片段，不是完整可安装包。完整工具还要声明 `file.read` 等具体操作权限。`capabilities.describe()` 查询当前上下文的支持、依赖和授权状态；能力存在不等于用户授权。Tool、Service call、Service start/stop、View、Provider 的权限不能互借。

## 公开扩展入口

| 需求 | 当前入口与边界 |
| --- | --- |
| 文件、私有数据、配置、产物 | files、storage、settings、artifacts；复用宿主事务、配额和配置 revision |
| HTTP、凭据、流 | network、credentials、connections；HTTP/SSE 有界读取，凭据由宿主代发，不返回原始秘密；connections 使用已配置 Provider 的登录入口，不是任意 MCP OAuth 客户端 |
| 长任务 | tasks.submit/read/wait/cancel/events/progress；保留 taskRef 和请求键，恢复读取原记录，不自动重放处理器 |
| 外部程序或 Agent CLI | process.execute/spawn/read/write/end/stop；声明 nativeExecutables、允许参数和环境键，复用宿主进程管理；仍需自己实现外部 CLI 协议、认证和结果映射，不能称为 OS 沙箱 |
| 常驻服务 | defineService 与 Service 客户端；跨 RPC 的进程使用服务寿命，已结束调用的 Run 权限不可保存重用 |
| 提问和审批 | questions；准确操作审批 approvals 限原 Task 和原参数，不能把答复当授权或绕过宿主审批 |
| 会话、多 Agent、工作流、定时任务 | sessions、workflows、automations；使用原 SessionDirectory、WorkflowService、CronJobService 的权限、输入队列、revision 和回执，不自建 AgentLoop |
| 模型消费 | models.generate/stream；调用当前模型的有限文本或结构化输出，不执行工具循环，不提供任意 provider/model 覆盖 |
| 模型供应商 | /provider 的 adapter/executor；使用原 Service 和宿主模型调度，Provider 回调没有通用 Run 权限 |
| 浏览器和桌面 | computer.tools/read/call；使用实际 Driver 目录、原目标和操作回执，保留媒体、取消和防重放语义 |
| 自定义界面 | /ui 的 createPluginViewClient、mountPluginPanel；Code View 使用 ui.views 与 cotree.plugin-ui.v1，展示任务/日志/产物/配置，命令进入授权调用；页面不能直接调用模型或电脑控制 |

Skill 使用 skills[].name/description/path 和 skillDir/pluginRootDir；依赖使用 metadata.requiredTools，依赖准备不授予权限。Agent 模板沿宿主协作，不固定供应商模型。MCP 沿 mcpServers 的 stdio/HTTP 配置与宿主认证；Hook 只注册当前宿主支持的事件，不能搬入其他宿主的 Stop 重入循环。新 UI 使用 Code View，声明式整页只保留兼容。

## 创建工程

`scripts/scaffold.mjs` 不下载依赖、不安装插件，也不执行生成的业务代码；任何已存在的目标路径都会拒绝。`--kind skill` 生成无 SDK 依赖的声明式包。

代码工程直接委托公开 SDK 的 `cotree-plugin-init`，支持 `tool`、`service`、`view`、`task`、`file-workbench`、`batch-workbench`、`workflow-workbench`，不维护第二套模板。

```text
node scripts/scaffold.mjs --output ./new-plugin --id com.example.report --name Report --kind file-workbench --sdk <installed-SDK-directory>
```

也可在已安装公开 SDK 的开发目录运行并省略 `--sdk`。`--sdk` 指含 package.json、bin、dist、templates 的已安装包目录，不是宿主根或 tgz 文件。可用本地 `cotree-plugin-sdk-0.14.0.tgz` 安装公开 SDK；缺包时明确报错，不回退到旧模板。初始化器会将项目依赖固定到 0.14.0；若使用未发布的本地构建，在生成工程安装同一个 tarball 替换注册表依赖，然后运行 `npm run package`。

各官方模板带 strict TypeScript、构建/ZIP 脚本及 contract-tests.json。按业务选择模板，检查其示例文件/工具/Service/UI 权限并收窄；不能假定所有模板都是无权限 echo。依赖应打包为自包含资源，宿主不会在生产执行阶段 npm install。

## 验证与升级

先运行类型检查和构建，再用 `cotree plugin validate <plugin.json> --json` 校验，以及 `cotree plugin sdk-test package --fixture contract-tests.json --yes --json` 在隔离宿主验证。`package` 指构建出的目录。具体选项以当前 CLI help 为准。PluginValidate/PluginScaffold 用 proposalId，不能拿普通目录代替。

至少验证实际成功结果、缺失声明被拒绝、取消、禁用和适用的恢复场景。View 需 Desktop 界面证据，外部进程需实际退出/取消回执；模型测试记录真实 provider/model，账号和原生平台分别验收。成功安装、mock 或进程退出不能代替业务结果。

更新源包 SemVer、权限差分和完整性；改包不能复用旧签名。保留活动 Task/Process/Session 的原身份，升级读取不授予旧调用的写权限。需要原接口没有的能力时先记录缺口，再评估宿主扩展，不能绕过 Broker、直接写宿主 DB 或复制执行循环。
