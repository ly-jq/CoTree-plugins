# SharePoint

在 CoTree 中搜索 SharePoint 站点、读取页面与文件、整理责任人与状态，并在授权范围创建或更新列表项。

- 插件：cotree.sharepoint，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 15 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.sharepoint.connect（显式调用）
- Skill：cotree.sharepoint.discover
- Skill：cotree.sharepoint.pages
- Skill：cotree.sharepoint.files
- Skill：cotree.sharepoint.lists
- Skill：cotree.sharepoint.update（显式调用）
- Skill：cotree.sharepoint.summarize



## 改造内容

- 把原宿主连接器声明改为七个原生工作流、15 个 Graph 固定动作与受限文件下载器。
- 列表更新要求具体 ETag，下载跳转不转发 Bearer；保留原图标、详情和来源。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生入口、协议或 REST 适配已实现；独立账户授权、真实对象读写、过期恢复和业务结果仍待验收。
- 仅全球 Microsoft Graph 工作 / 学校账户 delegated OAuth，无自动登录 / 刷新。文件下载仅接受观察到的单一 tenant.sharepoint.com 主机，最多 16 MiB；其他 CDN、主权云和大文件需另行适配。
- 未实现文件上传、Office 在线编辑、页面发布、共享权限修改或删除；可生成可审查修改稿，不能报告这些操作已经完成。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
