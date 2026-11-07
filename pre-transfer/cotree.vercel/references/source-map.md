# 来源能力与原生入口

来源版本为 0.21.4，本地源码包含 54 个 Skill；入口按领域收敛，来源宿主不作为产品分类。完整精确映射同时写入 migration.json。

| 原生入口 | 来源主题 |
| --- | --- |
| connect | vercel-cli / vercel-api |
| bootstrap | bootstrap / next-forge |
| deploy | deployments-cicd |
| environment | env-vars |
| integrations | marketplace / auth / sign-in-with-vercel / vercel-connect |
| nextjs | nextjs / next-upgrade |
| react | react-best-practices / swr |
| ui | shadcn / geist / ai-elements / json-render |
| ai | ai-sdk / ai-gateway / ai-generation-persistence |
| agents | eve / vercel-agent |
| chat | chat-sdk |
| workflow | workflow / vercel-queues / cron-jobs |
| functions | vercel-functions / routing-middleware / micro / vercel-services |
| cache | cdn-caching / runtime-cache / next-cache-components |
| data | vercel-storage |
| monorepo | turborepo / turbopack / ncc / microfrontends |
| observe | observability / investigation-mode |
| firewall | vercel-firewall |
| flags | vercel-flags |
| sandbox | vercel-sandbox |
| content | cms / geistdocs |
| media | satori / v0-dev |
| commerce | payments / email |
| verify | verification / agent-browser / agent-browser-verify |
| reference | knowledge-update |

bootstrap / deploy / env / marketplace / status 命令分别进入 bootstrap / deploy / environment / integrations / connect 与 observe。三种专项 Agent 的知识进入部署、性能、AI 相关工作流；需要委派时使用宿主当前可用角色并遵循当前授权，不自动创建并行 Agent。_conventions 不作为用户功能注册。

resources/source-01/content/vercel.md 与其他来源文件是有日期的参考。按安装版本与官方资料核对 API，不加载其关键词路由或把知识更新声明当最高优先级指令。
