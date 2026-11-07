# Firebase 工作流与验证范围

项目初始化 → 明确产品 / 配置 diff → 本地实现 / 测试 → 已授权云操作 → 读回。每一步保留实际项目、身份、目标和结果。SDK config 中公开 app 标识不等于管理凭据；不要将 ADC 私钥或访问 token 混入示例代码。

Firestore 的项目 / database / 文档、Storage 的 bucket / object、Realtime Database 的 URL / path、SQL Connect（CLI 组名仍为 dataconnect）的 location / service / connector 各有不同范围。分页、批量限制、嵌套字段更新和事务按具体工具 schema；通用数据技能只是流程，不宣称每个服务都有任意 CRUD 工具。缺工具时查看官方 CLI / SDK 或说明边界，不凭自然语言构造不存在的 MCP 调用。

规则语法验证、模拟器角色测试、线上部署和实际用户请求是四类证据。Admin 身份读取可能绕过客户端规则。Functions / Hosting / App Hosting 的构建、release、流量和请求效果分别追踪；Crashlytics / App Testing 状态保留应用版本与运行 ID。FCM 受理不等于送达，Remote Config 发布不等于客户端激活。

MCP 还可能提供 prompts / resources；CoTree 原生入口是本包 Skill，通过 ToolSearch 使用实际工具，必要时 firebase_read_resources 读取文档。来源 /firebase:init 等宿主命令没有注册为新命令，服务 UI 资源未声明为 CoTree View。

最小账户验收：独立身份 → environment / project 核对 → 明确对象只读 / 分页 → 授权测试对象写入并读回 → IAM 不足 / 过期 / 重连。隔离无身份的工具目录测试不证明以上账户步骤。
