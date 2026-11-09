# SDK 0.13.0 / API 1 适配结果

2026-11-09 检查当前目录的全部 93 个插件。93 个根清单均为受支持的 Manifest v3；没有注册 SDK code tool、Service 或 npm SDK 依赖。其中 92 个已有原生适配，security-review 仍保留此前的 integration-pending 状态。普通 Node/Python 辅助脚本、MCP 子进程和归档来源不等于 SDK 代码插件。

## 本次升级

| 插件 | 版本 | 实际变化 |
| --- | --- | --- |
| cotree.plugin-development | 0.2.0 → 0.3.0 | 代码工程直接委托公开 SDK 0.13.0 的官方初始化器，支持 tool、service、view、task、file-workbench、batch-workbench、workflow-workbench；生成 Manifest v4 / API 1、TypeScript、构建和合同测试。同步通用能力、调用作用域、权限、升级与恢复说明。 |
| cotree.example-plugin | 0.2.0 → 0.2.1 | 修正教学入口，区分仍受支持的声明式 v3、普通 echo 辅助脚本与使用 SDK 的 v4 代码插件；接入最新作者模板说明，保留原 echo 行为。 |

两包自身只贡献 Skill，因此根清单继续使用 v3，没有额外运行权限。代码模板只有一份，来自 SDK；插件侧不复制执行器、模型循环或持久化状态。原始 resources/provenance 保留，版本、migration、完整性与 inventory 已更新，主仓库对应生成来源同步，避免重新生成后回退。

## 其他 91 个包的处理

这些包不消费已变化的 SDK 代码接口，不需要为升级 SDK 统一改成 v4。

- 纯 Skill / Agent 包继续通过原宿主发现与加载；辅助脚本仍按原工具授权执行。
- 38 个 MCP 声明继续使用原 MCP 管理器与认证合同。SDK connections 不是替换所有 MCP OAuth 的新认证系统。
- hookify 保留原 Hook/Broker 接线，实际隔离 Hook 的允许/阻止回归通过。
- mcp-server-dev 生成的 v3 MCP 包仍是有效声明式格式，不需要增加 SDK 依赖。
- agent-sdk-dev 的 TypeScript/Python 模板面向独立 Claude Agent SDK 应用，其版本不能机械替换成 CoTree SDK 0.13.0。
- session-insights 的历史统计与 SDK 当前会话操作范围不同，本次不改写成另一套事件读取或执行实现。
- security-review 保持原跳过/待集成状态；清单可安装不意味着其业务能力已完成。

product-design 原有的 0.2.1 和其他未完成修改被保留。本轮没有更新上游外部服务/第三方 SDK 版本，也没有安装、启用或修改用户个人插件实例。

## 验证

- 全目录清单和完整性检查：93 包、614 个 Skill、15 个 Agent、38 个 MCP 声明。
- 全目录隔离安装、加载目录及禁用后移除贡献：通过；不启动外部服务或模型。
- 原生插件相关回归：29 个测试文件、356 项通过，包含脚手架、原始参数传递、缺包/错版本、拒绝覆盖及生成来源一致性。
- 实际 ZIP 的安装/禁用，以及从 ZIP 中提取的作者脚手架：通过。
- 从插件仓库原提交恢复两个 0.2.0 包并核对基线摘要，再安装新版、重载和禁用：通过，6 个 Skill 的名称保持一致且版本更新。
- 独立工程安装公开 SDK tarball、七种模板 typecheck/build/package 和真实 Kernel 合同执行：19 项通过，包含成功结果和权限/范围拒绝；宿主与 SDK 在模板检查期间保持不变。
- 主仓库 typecheck、lint 及无未归因 unknown 审计通过。
- harness:check 通过：15 个测试文件、200 项，以及文档与合同检查。

本次自动化在 Windows / Node 24 执行。模板界面完成构建与宿主贡献合同检查，没有增加 Desktop 视觉验证、真实账号、模型或外部业务结果的新证据；workflow-workbench 的无 Session 授权拒绝检查不等于真实工作流完成。SDK 既有平台证据范围见[迁移手册](../../docs/plugin-sdk-manual/21-migration-and-release.md)。

## 复现与使用

从 CoTree 主仓库运行：

```text
pnpm exec tsx scripts/pre-transfer-plugins.mts --check
pnpm exec tsx scripts/verify-pre-transfer-install.mts
pnpm exec vitest run tests/plugin-runtime/plugin-native tests/scripts/pre-transfer-integrity.test.ts
pnpm test:pre-transfer-sdk --output <new-evidence-directory>
```

最后一条命令将公开 SDK 打成 tarball，在仓库外建临时工程，从实际插件 ZIP 安装后取出脚手架，逐模板构建并运行隔离合同。它不修改个人 registry，不发布 npm/GitHub；报告、ZIP、SDK tarball 和 SHA256 保留在指定目录。脚手架自身不联网下载；验证命令会通过当前包管理器安装构建依赖。

要使用新版作者工具，可在 Desktop 插件管理中导入 `cotree.plugin-development-0.3.0.zip`；示例包导入 `cotree.example-plugin-0.2.1.zip`。SDK 0.13.0 的本地 tarball 单独用于插件开发，不是 Desktop 插件 ZIP。生成代码工程后的安装、信任、执行仍走原宿主生命周期。

本次执行与证据索引见[实施记录](../../docs/exec-plans/pre-transfer-sdk-upgrade-2026-11-09.md)。
