# Hookify 原生合同

配置：工作区 .cotree/hookify/rules.json，schemaVersion=1，rules数组。每条必须有id、enabled、phase(before/after/run_completed)、tools（精确工具名或*）、action(warn/block)、message、conditions。每个condition包含field（事件点路径，如input.command）、operator(regex_match/contains/equals/not_contains/starts_with/ends_with)、pattern。字段缺失不匹配。条件AND，工具名OR；不读取任意transcript文件。

示例见examples/rules.json，默认禁用。用宿主文件工具编辑，不能修改已安装包。两个lifecycleHook仅使用当前tool_lifecycle和run_completed，受宿主审批/信任、2秒超时及取消控制。before返回block才能阻止；after/完成阶段仅告知。无UserPromptSubmit/Stop再触发。插件安装不替用户安装任何安全策略。

权限只读工作区固定规则路径；128KiB配置、64规则、16条件、256字符pattern、32KiB字段上限。正则由用户显式定义，不按自然语言关键词路由任务；复杂正则可能耗尽宿主超时，fail-open行为由宿主决定，因此不能当强安全边界。

调试可导入hooks/rules.mjs调用validateRules和evaluateRules；正式验证必须经真实CoTree子宿主和ToolDispatcher，禁用后不再挂载。来源Python/YAML配置没有自动执行，迁移旧规则时明确字段和phase，Stop/prompt仅保留为说明。
