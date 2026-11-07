# Zoom

读取 Zoom 会议资料并开发 APIs、SDK、OAuth、事件与实时通信集成。

- 插件：cotree.zoom，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 23 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.zoom.connect（显式调用）
- Skill：cotree.zoom.meetings
- Skill：cotree.zoom.plan（显式调用）
- Skill：cotree.zoom.auth（显式调用）
- Skill：cotree.zoom.rest（显式调用）
- Skill：cotree.zoom.meeting-sdk（显式调用）
- Skill：cotree.zoom.video-sdk（显式调用）
- Skill：cotree.zoom.apps（显式调用）
- Skill：cotree.zoom.bots（显式调用）
- Skill：cotree.zoom.events（显式调用）
- Skill：cotree.zoom.communications（显式调用）
- Skill：cotree.zoom.debug（显式调用）
- Agent：cotree.zoom.reviewer
- MCP：cotree.zoom.meetings

## 改造内容

- 重复命令、开发Skill与两个Reviewer按能力归并，显式开发入口保留全部产品参考。
- 原生Meetings MCP使用独立OAuthheader绑定，移除来源client_id/应用映射依赖。
- 新增Node标准库Webhook工程，原始字节验签、时间窗和CRC挑战，协议ACK与业务完成分开。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 独立OAuth登录/刷新、租户准入、真实会议资产读取和所有SDK平台实机运行未验收。
- 本地Webhook样例不含生产部署、持久幂等与业务处理；协议确认不等于事件处理成功。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
