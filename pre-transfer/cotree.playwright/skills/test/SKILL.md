---
name: cotree.playwright.test
description: "用 Playwright MCP 检查网页交互、表单、可访问性快照和浏览器测试。"
disable-model-invocation: false
---

# Playwright

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

确认目标 URL、环境和待验证行为；优先本地测试页面及测试账户。通过 ToolSearch 发现 cotree.playwright.playwright 的实际工具，读取参数 schema，再观察当前页面。
从最近快照取得元素引用，执行与任务匹配的导航、输入、点击和断言。快照若返回文件链接，用 Read 读取该实际文件，再从内容取得元素引用；不能把文件路径当元素引用。页面变化后重新观察，不复用过时引用，不凭猜测元素 ID 操作。区分工具确认、页面变化与真实业务结果；表单提交后读取结果而不是只看点击回执。
只在任务授权范围内发送数据、购买或发布。截图 / 日志可含敏感信息，保存在任务输出并在交付前检查。测试结束关闭测试页面 / 浏览器，保留失败步骤和证据。
浏览器缺失、启动失败或网络超时应明确报告；不要静默切换到个人浏览器。已有 CoTree 浏览器可以完成任务时无需同时驱动两个控制面。
