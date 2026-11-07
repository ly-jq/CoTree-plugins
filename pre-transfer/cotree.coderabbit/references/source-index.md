# 来源与分工

原 code-review Skill 与品牌素材完整保留在 resources/source-01/content。仅根 Manifest 注册的三个原生 Skill 加载。普通本地审查由 cotree.code-review 负责，CodeRabbit 仅处理明确选择的外部服务工作流，避免重复默认触发。

解析器只读取最多 8 MiB / 20000 条事件，不调用 shell 或网络。运行语法：node scripts/coderabbit-output.mjs --input review.ndjson --exit-code 0（必须替换为真实退出码）。输出诊断必须连同部分 findings 保留；辅助进程返回 2 表示输入包含未完成 / 待行动结果，不是 CodeRabbit 原进程退出码。

协议及账户说明见 [connection.md](connection.md)。官方文档会变化；旧字段或新事件不可静默判成功。
