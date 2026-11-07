---
name: cotree.language-services.navigate
description: "通过真实 LSP 获取定义、引用、类型、符号、调用关系或重命名预览。"
disable-model-invocation: false
---

# 语言服务

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
先确认目标文件已保存和作用域正确，用 Read 定位一基 UTF-16 行列，再调用 LSP 的实际 action。definition / references 固定文件版本，workspaceSymbols 给出具体 query；只有服务声明支持时使用调用关系。
检查文档 hash / version、stale、truncated 和 omittedOutsideScope，缺环境、范围或索引时如实说明。renamePreview 仅返回建议，不会改文件；需要执行改名时逐项检查范围、冲突与用户授权，再经文件工具修改并验证。不要混用 grep 文本位置与语言语义证据。
