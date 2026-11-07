# Laravel 项目级 Boost

唯一 MCP 为 cotree.laravel-boost.laravel-boost，stdio 命令 php，参数 artisan、boost:mcp；cwdBase=workspace，不从插件归档目录启动。先核对 composer.json / composer.lock、artisan、vendor/autoload.php、PHP / Composer 版本。检查器仅读有大小上限的普通 JSON 文件，不执行 Composer scripts、artisan 或 .env。

Boost 缺失且用户任务允许安装时，用正常 Composer 工作流加入开发依赖并检查 lockfile。boost:install / boost:update 可生成或修改 agent 指令，不能自动改其他宿主配置或覆盖用户规则；直接手动注册上述 MCP 即可表达原服务入口。CoTree 插件完整性与项目 vendor 更新分别管理。

启动 MCP 就会 boot 应用，项目 service provider 可能有副作用。数据、日志与任意代码工具的可用性由实际版本决定，工具名不是只读保证。无独立云 OAuth 门槛，但项目数据库、私有 Composer 仓库及外部服务有各自权限；不把 PHP 缺失记成账户问题。

2026-10-07：[官方 Boost 文档](https://laravel.com/docs/13.x/boost)。PHP / Composer、真实库和各平台运行分别验收；当前机器未发现 PHP / Composer。
