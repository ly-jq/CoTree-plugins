# cwc-makers

用独立 USB / MicroPython 工具准备和迭代 Cardputer / M5Stack 应用，明确刷写与设备验收边界。

- 插件：cotree.cwc-makers，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 25 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.cwc-makers.setup（显式调用）
- Skill：cotree.cwc-makers.flash（显式调用）
- Skill：cotree.cwc-makers.apps
- Skill：cotree.cwc-makers.debug



## 改造内容

- 替换 Claude 专属命令、后台监控和默认板型，用 CoTree 工具与显式 USB 目标。
- 新增跨平台工程生成和设备 argv 计划，固件绑定独立 SHA256；不自动执行刷写。
- 原 onboarding 技术资料完整保留，明确外部 app bundle 依赖和 BLE 限制。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本包 USB/MicroPython 路径可独立调用，不提供 Claude Desktop Hardware Buddy BLE bridge。
- 源码原包不含外部固件/应用 bundle；实际使用需取得正确版本、板型与许可。
- CLI/协议夹具和命令准备不证明实体串口、刷写、屏幕/按键或应用工作正常。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
