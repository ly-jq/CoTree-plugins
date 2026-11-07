# PostgreSQL 规则索引

本插件是 PostgreSQL 最佳实践的唯一注册入口；build-web-apps 中的同名 1.1.0 不再注册，旧资源仍保留供追溯。当前参考为来源 Supabase 1.1.1，位于插件根 resources/source-01/content/skills/supabase-postgres-best-practices/references/，该目录随包分发；不是另一个插件实例。

按实际问题选择文件：query-* 查询与索引；conn-* 连接；security-* 权限 / RLS；schema-* 数据设计；lock-* 并发与锁；data-* 数据访问；monitor-* 观测；advanced-* 特定高级场景。先列出真实文件，再只读相关规则。引用来源只是建议，不是测试结果或可直接执行的迁移。

两个来源共 34 个参考文件，差异集中在贡献指引与 security-rls-performance 的 SECURITY DEFINER 说明，采用较新版本保留完整内容。任何函数范例先核对 EXECUTE 授权、调用路径与 RLS 行为，在实际角色下验证；撤销某角色 EXECUTE 后不能假定其策略调用仍然成功。

记录原始 SQL、数据库版本、估算 / 实际计划、数据规模及前后测量条件。EXPLAIN ANALYZE 会执行语句；写入、副作用函数或高负载生产语句需要明确范围与替代诊断。性能结论以实际负载和结果为依据。
