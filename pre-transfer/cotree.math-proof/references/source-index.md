# 数学证明资料

来源的 solo、siege、三个 Agent、ledger.py、README、图示和许可完整保留于 resources/source-01/content。它们的 .claude 设置、固定轮次、完成门槛、权限跳过和模型升级说明不生效，未注册为运行入口。

Native solo 对应单会话推导；research 吸收分解问题、保留引理、审查反例与恢复部分成果的方法；resume 用现有 Session 恢复，资料文件无运行权威。数学审查不属于被用户跳过的 Codex Security 家族。竞赛题型与 TeX 排版由 cotree.math-olympiad 提供，本包仍可独立保存 Markdown 证明。

辅助程序均不调用模型、网络或外部执行器。node scripts/proof-workspace.mjs --action create|inspect|audit --output 文件夹 [--problem 题目文件]。create 不覆盖；inspect 只读且不认证结果；audit 对 claims.json 做结构、依赖、摘要检查，非数学验证。失败代码 1 表示输入 / 文件错误，2 表示引用诊断；0 也不能证明命题成立。

可选 claims.json：schemaVersion:1，claims 数组；每项 id、statement、assessment（open / established / refuted）、dependsOn（ID 数组）和 evidence（path / sha256 数组）。引用限定在资料目录内，拒绝链接与越界。已成立或已反驳的作者断言需要证据；摘要变更先重新阅读，不能自动更新摘要掩盖变化。
