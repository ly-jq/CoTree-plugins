# 项目状态页

Node20+，纯本地生成无需账号。命令：node scripts/project-artifact.mjs render data.json project.html [expected-previous-sha256]。data.json≤1MiB，结构见examples/project.json；生成HTML≤5MiB。初次输出拒绝覆盖；刷新需精确前摘要，文件锁与备份保护已有内容。固定单文件HTML嵌入artifact-state，只存派生观察，不是任务状态权威。

每行必须关联来源；远程链接仅HTTPS，本地引用只显示路径文字。外部文本做转义，来源不可注入脚本，页面无网络依赖。状态由主模型基于实际证据填写，脚本不以关键词/固定阈值宣告完成。来源fresh/stale/unavailable表示观察情况，不推断业务成功/失败。

可选git/gh读取依赖该仓库身份，发布依赖用户明确选择的部署账户；无需原Claude Artifact身份。完整来源SKILL/template.html/swe.md与许可证保留于resources/source-01/content，模板与领域规则已覆盖到三个原生入口。实际发布、私有权限与真实PR读取未包含在合成浏览器验证中。
