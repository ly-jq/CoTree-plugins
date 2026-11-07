# Google Drive

统一 Google Drive、Docs、Sheets、Slides 和评论的 CoTree 工作流，含独立 Google REST 入口。

- 插件：cotree.google-drive，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 7 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.google-drive.connect（显式调用）
- Skill：cotree.google-drive.discover
- Skill：cotree.google-drive.organize（显式调用）
- Skill：cotree.google-drive.docs
- Skill：cotree.google-drive.sheets
- Skill：cotree.google-drive.slides
- Skill：cotree.google-drive.comments（显式调用）
- Skill：cotree.google-drive.transfer（显式调用）

- MCP：cotree.google-drive.google-drive

## 改造内容

- 五类来源能力收敛为八个原生工作流，保留文档 / 表格 / 演示的互补资源，不拆成重复插件。
- 新增固定操作的 Drive / Docs / Sheets / Slides API 客户端、精确 URL 解析、原生导入与有界文件输出。
- 移除原宿主私有工具桥、强制生成 ChatGPT 文件夹和无条件重建文档；版本、结构及真实工具能力优先。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 官方 Drive MCP 为开发者预览，需要准入、Cloud 项目启用和独立 OAuth；CoTree 登录 / 刷新尚待接入。MCP 当前工具集不等于原宿主完整编辑连接器。
- 独立 REST 使用 COTREE_GOOGLE_DRIVE_ACCESS_TOKEN，需启用目标 Drive / Docs / Sheets / Slides API 并授予匹配 scopes；真实文件读写未验收。
- 原宿主私有 dropdown / trusted-read / Perl 传输桥不执行。公开 API 不支持的控件必须保留并单独确认可用 UI 能力，不能以文本替换冒充原生控件。
- 辅助脚本分页显式推进，JSON 响应最多 8 MiB，下载最多 20 MiB，本地 Office 导入最多 10 MiB；Google files.export 自身上限 10 MB。大文件流式 / 可恢复传输和永久删除未封装。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
