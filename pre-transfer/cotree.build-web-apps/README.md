# 网页开发

在真实项目中构建、接入和调试网页应用，复用已有设计及领域插件。

- 插件：cotree.build-web-apps，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 8 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.build-web-apps.build
- Skill：cotree.build-web-apps.integrate
- Skill：cotree.build-web-apps.debug
- Skill：cotree.build-web-apps.deliver



## 改造内容

- 重写网页构建和浏览器调试入口，移除强制 ImageGen、10/10 自评分、固定 IAB / Sites 和逐阶段批准。
- 数据库 / 支付 / React / shadcn 使用现有唯一能力归属，保留来源快照但不重复注册。
- 新增跨平台只读工程检查器及可执行的浏览器 / 交付指导，既有工程优先。
- PostgreSQL 规则由 Supabase optimize 统一提供；采用来源 1.1.1 的完整 34 份参考，旧 1.1.0 只归档。独立使用网页开发包的该能力需同时安装 Supabase 包。
- React 最佳实践统一到 Vercel react；两份规则忽略行尾空白后相同，保留完整规则集。网页开发包使用该能力需同时安装 Vercel 包。
- shadcn 统一到 Vercel ui，互补的组件组合、样式、表单及 CLI 参考随 Vercel 独立打包；旧入口不再重复注册。
- Stripe 最佳实践由 Stripe integrate 统一提供，保留较完整的六类领域参考；网页开发较旧副本仅归档，该能力需安装 Stripe 包。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 工程检查器只读指定 package.json 和目录存在性，不运行项目、不验证页面或云服务。
- 真实页面需要项目依赖、浏览器与测试数据；模型、数据库、支付和部署身份分别验收，当前未执行账户操作。
- 复杂设计 / 原型可使用产品设计包，视觉实现可使用前端设计包；缺少可选插件时沿现有项目工具继续，不自动安装或重复注册其入口。
- PostgreSQL 规则由 Supabase optimize 统一提供；采用来源 1.1.1 的完整 34 份参考，旧 1.1.0 只归档。独立使用网页开发包的该能力需同时安装 Supabase 包。
- React 最佳实践统一到 Vercel react；两份规则忽略行尾空白后相同，保留完整规则集。网页开发包使用该能力需同时安装 Vercel 包。
- shadcn 统一到 Vercel ui，互补的组件组合、样式、表单及 CLI 参考随 Vercel 独立打包；旧入口不再重复注册。
- Stripe 最佳实践由 Stripe integrate 统一提供，保留较完整的六类领域参考；网页开发较旧副本仅归档，该能力需安装 Stripe 包。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
