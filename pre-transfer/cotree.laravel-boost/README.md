# Laravel Boost

以项目级 Laravel Boost MCP 辅助 CoTree 读取应用结构、查版本文档、开发、调试和验证 PHP / Laravel 工程。

- 插件：cotree.laravel-boost，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 17 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.laravel-boost.connect（显式调用）
- Skill：cotree.laravel-boost.inspect
- Skill：cotree.laravel-boost.docs
- Skill：cotree.laravel-boost.develop
- Skill：cotree.laravel-boost.data（显式调用）
- Skill：cotree.laravel-boost.verify

- MCP：cotree.laravel-boost.laravel-boost

## 改造内容

- 保留唯一官方 stdio 入口，工作目录明确绑定当前 Laravel 应用 workspace，补齐六项原生工作流。
- 新增不启动应用的 JSON 预检，区分项目依赖、实际 MCP 运行、数据访问和写入；不自动重写项目指令。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流、随包工具和安装合同已改造；真实模型任务、用户工程、账户发布及各平台设备效果需分别验收。
- 需要匹配项目的 PHP / Composer、artisan 与已安装 laravel/boost。MCP 启动会执行项目代码与配置，不是只读沙箱；生产数据库、写操作和外部服务仍受用户授权限制。
- 当前机器未发现 PHP / Composer，真实 Laravel 应用启动和数据库效果未验收；SDK 夹具只验证 CoTree 协议与 cwd，不冒充 PHP 执行。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
