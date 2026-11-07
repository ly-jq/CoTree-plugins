# Boltz

通过独立 Boltz CLI 规划分子计算、核对成本并恢复已提交任务。

- 插件：cotree.boltz-api-cli，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 24 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.boltz-api-cli.connect（显式调用）
- Skill：cotree.boltz-api-cli.recover（显式调用）
- Skill：cotree.boltz-api-cli.structure（显式调用）
- Skill：cotree.boltz-api-cli.adme（显式调用）
- Skill：cotree.boltz-api-cli.molecule-screen（显式调用）
- Skill：cotree.boltz-api-cli.molecule-design（显式调用）
- Skill：cotree.boltz-api-cli.protein-screen（显式调用）
- Skill：cotree.boltz-api-cli.protein-design（显式调用）



## 改造内容

- 移除Codex/Claude后台会话、强制定时任务及过时ADME下载限制，使用宿主可取消执行与官方CLI实际help。
- 新增跨平台只生成argv的任务规划 / 恢复器，绑定payload SHA256并拒绝覆盖计划。
- 区分本地身份、真实估价、提交、下载和科学解释，保留独立账户及完整领域资料。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 官方CLI的本地help / 未登录检查与本地计划已可验证；账户、估价、计费、远程计算和分子结果未验收。
- 本地规划不是API payload schema验证；蛋白辅助脚本与其他OS另测。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
