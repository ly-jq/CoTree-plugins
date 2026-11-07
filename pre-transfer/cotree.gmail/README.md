# Gmail

Gmail 检索、线程读取、草稿、授权发送与标签管理，含独立 API 和本地 MIME 生成。

- 插件：cotree.gmail，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 7 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.gmail.connect（显式调用）
- Skill：cotree.gmail.search
- Skill：cotree.gmail.read
- Skill：cotree.gmail.draft（显式调用）
- Skill：cotree.gmail.send（显式调用）
- Skill：cotree.gmail.organize（显式调用）

- MCP：cotree.gmail.gmail

## 改造内容

- 为连接器来源补齐六个原生工作流，明确草稿与发送、线程定位、分页及未知结果恢复。
- 新增独立 Gmail REST 脚本和 UTF-8 MIME 生成器；收件人 / 标题防换行注入，保留 RFC Message-ID 与线程关系。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Gmail MCP 为开发者预览，需准入、API 启用和独立 OAuth；登录 / 刷新及真实邮箱场景待验收。
- REST 使用 COTREE_GMAIL_ACCESS_TOKEN，scopes 按读取 / 草稿 / 发送 / modify 区分，metadata scope 不能作为完整搜索与正文权限。
- 本地 MIME 生成器支持 UTF-8 纯文本、To / Cc / Bcc 和线程回复，不包含 HTML / 附件组合器；API 接受合规完整 MIME，附件读取已封装。没有后台监控、定时发送或永久删除实现。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
