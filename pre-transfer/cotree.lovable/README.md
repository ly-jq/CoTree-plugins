# lovable

通过独立 Lovable MCP 创建、迭代和发布应用，并核对项目、额度与真实预览。

- 插件：cotree.lovable，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 28 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.lovable.connect
- Skill：cotree.lovable.build（显式调用）
- Skill：cotree.lovable.iterate（显式调用）
- Skill：cotree.lovable.publish（显式调用）

- MCP：cotree.lovable.lovable

## 改造内容

- 用独立官方MCP替换宿主私有App连接器。
- 提供创建、迭代、检查、知识/数据和发布原生入口，付费调用与公共发布边界明确。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 独立OAuth/PKCE、令牌刷新、真实项目与额度未验收；仅匿名元数据/认证边界可验证。
- 客户端专属widget/设计导入按实际宿主能力省略，不伪造UI回执。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
