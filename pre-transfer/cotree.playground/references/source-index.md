# Playground 模板索引

六份完整技术模板保留在 resources/source-01/content/skills/playground/templates：design-playground.md、data-explorer.md、concept-map.md、code-map.md、document-critique.md、diff-review.md。分别覆盖样式决策、数据筛选、概念关系、代码结构、文档建议和逐行 diff。它们是设计与实现参考，不会自动加载其原宿主指令。

根 template/index.html 是可直接运行的设计类示例，内联 CSS / JS，无外部请求、依赖或自动发布。bootstrap 拒绝任何已存在目录，导出页面保留选择并对 script 内状态做安全序列化。无 Clipboard 权限时选中文字，用户可手工复制。其他五类根据实际任务内容实现，当前样例测试不覆盖真实仓库 / 数据 / 文档。
