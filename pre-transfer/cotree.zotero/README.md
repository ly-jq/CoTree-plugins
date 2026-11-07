# Zotero

在 CoTree 中检索 Zotero Desktop 文献、导出 BibTeX 和格式化书目、准备准确引用，并读取指定附件或导入授权文献。

- 插件：cotree.zotero，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 16 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.zotero.connect（显式调用）
- Skill：cotree.zotero.inventory
- Skill：cotree.zotero.search
- Skill：cotree.zotero.export
- Skill：cotree.zotero.bibliography
- Skill：cotree.zotero.cite（显式调用）
- Skill：cotree.zotero.attachments（显式调用）
- Skill：cotree.zotero.import（显式调用）



## 改造内容

- 将来源工作流重写为八个原生入口；使用 Node.js 标准库替换 Python 执行依赖，完整保留 Python 来源与路由参考。
- 增加固定 loopback、显式分页 / 内容开关 / 导入目标核对，以及无部分写入的离线引用计划；实际文稿编辑复用 CoTree 文件工具。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流与协议适配已实现；真实账户或本地 Desktop 文献库、模型任务效果及跨平台运行仍待验收。
- 需运行 Zotero Desktop 并启用本地 API，固定 127.0.0.1:23119；不自动改 prefs、重启、读取数据库或暴露端口。没有新增远程账户依赖。
- 本包使用本地 API 读取与 Connector 导入；未实现 Zotero 10 的直接对象写入 / 本地授权密钥、附件上传或云 API。Connector 导入依赖当前 UI 选择，预检查无法消除选择变化竞争，需导入后确认实际目标。
- 引用规划器处理有界 BibTeX 结构，不执行 TeX 或解析宏；同键内容不同、多个待引条目或 marker 歧义时拒绝，需要先解决冲突。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
