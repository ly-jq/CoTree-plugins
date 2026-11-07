---
name: cotree.apple-development.signing
description: "诊断 Apple 签名、Entitlements、沙箱和 Gatekeeper。"
disable-model-invocation: false
---

# Apple 应用开发

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

先只读核对 bundle identity、team、profile、certificate、entitlements 与目标平台。区分本地 ad hoc、开发签名和分发签名，修改最小项目配置；不导出私钥、打印凭据或全局关闭 Gatekeeper。签名与运行检查分别记录，真实开发者身份另在连接清单验收。

领域参考（保持原相对目录）：
- resources/source-02/content/skills/signing-entitlements/SKILL.md
- resources/source-02/content/commands/fix-codesign-error.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
