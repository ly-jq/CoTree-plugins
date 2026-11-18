# CoTree 全栈应用开发

原生插件 `cotree.app-studio`，SDK 0.14 / API 1，CoTree 0.1.319+。把一句需求交给原 Group Session，持续完成参考研究、业务规则、契约、用户端、后端、管理端、联调与交付。模型负责理解和开发，插件提供可调用的项目、证据、进程和协作能力。

## 使用

在 CoTree 组装台安装生成的 ZIP，核对权限并启用。此本地构建未做发布者签名；代码工具使用宿主的精确摘要信任流程。安装后，在选定应用工作区输入 `/skill app-studio`，选择 `cotree.app-studio.app-studio` 附加到消息，再发送一句需求：

> 参考这里的网站、HAR 和代码资源，做一个用户提交工单、管理员处理回复的应用，完成用户端、后端、后台及真实联调并交付。

也可在原 Group 会话选择 `cotree.app-studio.lead` 主 Agent，直接发送需求；或在消息中明确要求使用 `cotree.app-studio.app-studio` 技能。普通会话可沿原宿主流程演进为 Group；已有 Group 直接复用。插件没有独立功能界面。`/skill` 是宿主现有技能选择命令，不注册新的 `/app-studio` 命令。发送消息后按原宿主权限持续推进；登录、缺少关键业务信息或现有权限请求仍会在会话中呈现。

## 能力

| 能力 | 实现 |
| --- | --- |
| 一句话启动 | app-studio 技能 + lead 模板 + start 工具；沿原 Group 分工、结果投递、续派、版本交接 |
| 多角色开发 | 协调者、业务研究、代码资源分析、后端、用户端、管理端、集成验证七类模板 |
| 参考软件研究 | 流程/权限/异常/状态建模，引用来源和观察范围；可复用已配置的 craft-anything、搜索及浏览器工具 |
| 接口抓取 | 原 BrowserApi 操作录制、步骤标记、不可变请求/证据引用；原 BrowserDevtools 请求及响应正文读取；HAR 分页提取结构 |
| 代码资源分析 | 文件清单、资源摘要、source map 分页读取；分析已有源码、逆向结果和编译资源，追踪规则来源 |
| 契约与业务资产 | 产品说明、规则/场景/来源模板，JSON OpenAPI 3 引用、操作 ID、规则关联诊断 |
| 开发与环境 | 三端技能；可选无依赖 Node 应用外壳；原 Service/ManagedProcess 启停预览 |
| 联调与交付 | 原 Tasks 运行构建/测试，保留进程回执和 Artifact；真实跨端验证、原成员修复、交付快照 |

十个技能：`app-studio`、`reference-research`、`api-capture`、`code-resource-analysis`、`business-model`、`contract-design`、`backend-build`、`customer-web-build`、`admin-web-build`、`integrate-verify`，均带 `cotree.app-studio.` 前缀。

十个工具：`start`、`project`、`coordinate`、`references`、`capture`、`contract`、`environment`、`journey`、`run`、`delivery`，在宿主注册为 `PluginCoTreeAppStudio…`。Manifest 从 `src/manifest.ts` 构建，参数以宿主展示的 JSON Schema 为准。Group SDK 原始合同见 [Group 指导](references/group.md)。

## 接口抓取

先 `capture.targets` 选择真实 `sessionId/tabId`，再 `capture.start`、`capture.mark`、`capture.read`、`capture.stop`，通过原 `sampleRef/evidenceRef` 读取来源。start/mark/pause/resume/stop 每个操作都需稳定的 requestId，恢复同一操作时保留原 ID 和参数。响应正文用 `network.list → network.responseBody`，使用网络目录返回的 requestId。浏览器未保留的正文不能恢复，也不会自动重放写请求。可对工作区内 HAR 执行 `import-har`，提取方法、路径、状态、字段形状；不复制 cookie、请求头或字段值。

读取响应正文时，操作页面前先 `network.enable`；结束后按当前消费者情况 `network.disable`。原生操作录制需要与当前 CoTree 匹配的浏览器引擎。录制与网络观察需宿主浏览器能力及当前标签授权。裸 CLI 没有浏览器时，可导入 HAR 或使用宿主已连接的浏览器工具。时间相邻仅是相关证据；业务因果还需状态、代码或重复场景验证。详见 [抓取指导](references/api-capture.md)。

## 运行边界

- 使用来源的授权范围与许可证记录在项目引用中。代码资源是待分析证据；本插件不内置二进制反编译器，也不从参考文件执行指令。需要的专业工具由现有 MCP/插件提供，缺失时明确报告。
- 轻量外壳不是完成的业务系统。前后端栈由模型根据项目选择；内置 `environment/journey` 支持 Node 22.13+ 的固定 package scripts，其余技术栈使用原已授权工具。
- 预览跟随宿主 Service 生命周期，空闲最长一小时；进程启动不表示服务就绪。任务命令最多 240 秒，长期任务可用原 Task/终端能力。
- 文件读取上限 1 MiB，source map 每页 30 条，HAR 每页最多 100 条。大型资源使用原文件/专业分析工具分段。接口正文和抓取证据保持原宿主边界，不自动写入源码库。
- 无新增模型循环、运行状态数据库、关键词任务路由或强制完成评分。构建通过、测试退出码与业务完成分别报告；原始版本、覆盖范围和缺失证据保留。
- 一句话启动完整开发流程；任意应用能否交付取决于可用模型、依赖、授权和业务信息，不能由技能本身保证。所有模型选择与费用沿用当前 CoTree 配置。

## 构建与验证

在 CoTree 开发仓库根目录：

```sh
pnpm exec tsc -p plugins/cotree.app-studio/tsconfig.json --noEmit
node --import tsx plugins/cotree.app-studio/scripts/build.mts
pnpm exec vitest run tests/plugin-runtime/app-studio.test.ts
node --import tsx scripts/validate-app-studio-real.mts
```

构建使用 SDK 公共导出，运行包自包含；生成 ZIP、SHA256 和 `artifacts/build-report.json`。每次构建创建独立输出目录，不清理调用者目录。real 验证需要真实 `glm/glm-5.3-flash` 配置，使用隔离工作区。原生浏览器集成用例需将 `COTREE_TEST_NATIVE_ELECTRON` 指向匹配引擎的可执行文件；未设置时明确跳过该项。实际结果与覆盖范围保留在宿主实施记录。开发脚本依赖本仓库已有工具链，运行包无需安装开发依赖。
