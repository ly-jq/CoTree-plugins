# CoTree 插件目录与改造队列

116 个本地来源归并为 **93 个 CoTree 插件**。按功能和服务组织；来源仅用于追溯。每个 cotree.* 子目录有原生 Manifest v3，可独立安装。

- native-adapted：92 个，运行内容已重写；实际业务证据另行记录。
- integration-pending：1 个，保留未完整改造状态；用户跳过项不进入队列。
- implementation-pending：0 个，仅有说明或参考，原功能仍缺实现。
- 实际待改造：0 个；用户要求跳过：1 个。

## SDK 0.13.0 适配

2026-11-09 已检查全部 93 个包。`cotree.plugin-development` 升级至 0.3.0，代码脚手架复用公开 SDK 的七种 Manifest v4 / API 1 模板；`cotree.example-plugin` 升级至 0.2.1，明确声明式包与 SDK 代码扩展的区别。其余 91 包的既有声明式合同继续受支持。逐项原因、验证和安装方式见 [SDK 适配结果](sdk-compatibility.md)；不因包可以安装而改变原业务验收状态。

## 批次与验证

按用户要求跳过 Codex Security 安全审查相关插件：cotree.security-review 家族保留原状，不自动排入后续批次。跳过记录见 inventory.json 的 skippedFamilies；该包仍计入总量和未完成状态。

第一批：前端设计、代码审查、Git 工作流。第二批：开发工作流、Context7、Playwright。第三批：GitHub、Linear、项目指令。第四批：语言服务、插件开发、Skill 编写。第五批：Notion、Figma、Supabase。第六批：Vercel、Sentry、Slack。第七批：Google Drive、Gmail、Stripe。第八批：MCP 服务开发、网页开发、产品设计。第九批：数据分析、网页数据可视化、PostHog。第十批：Asana、Atlassian Rovo、ClickUp。第十一批：Google Calendar、Outlook Calendar、Outlook Email。第十二批：Airtable、Dropbox、monday.com。第十三批：Cloudflare、Firebase、GitLab。第十四批：CircleCI、Datadog、Terraform。第十五批：Canva、Microsoft Teams、SharePoint。第十六批：Granola、Consensus、Zotero。第十七批：Expo、Remotion、Laravel Boost。第十八批：Serena、Temporal、Android 应用测试。第十九批：Game Studio、HyperFrames、Playground。第二十批：Mixpanel Headless、MagicPath、会话分析。第二十一批：Agent SDK Dev、OpenAI Developers、教学与解释。第二十二批：CodeRabbit、竞赛数学、数学证明。第二十三批：Shopify、Twilio Developer Kit、Zoom。第二十四批：生命科学研究、NGS 测序分析、Boltz。第二十五批：Apple 应用开发、NVIDIA、CWC Makers。第二十六批：代码现代化、Hookify、Ralph Loop、示例插件。第二十七批：Discord、Telegram、iMessage、Fakechat。第二十八批：Lovable、MCP Tunnels、Project Artifact。第二十九批：Adobe、ChatCut、Creative Production、Higgsfield。第三十批：OpenAI Ads Conversions、Public Equity Investing。除用户跳过的安全审查家族外，本地来源家族均已完成原生改造；账户、平台及外部结果验收继续单独跟进。热度与重要性共同决定优先级；官方安装量只作受众代理，同一家族不累加来源安装量。数据与来源链接在 [inventory.json](inventory.json)。

执行记录见 [分批改造计划](../../docs/exec-plans/plugin-native-batches-2026-10-06.md)。

- 核验：`pnpm exec tsx scripts/pre-transfer-plugins.mts --check`。
- 隔离安装：`pnpm exec tsx scripts/verify-pre-transfer-install.mts`。
- 重新生成：`pnpm exec tsx scripts/pre-transfer-plugins.mts --output <empty-directory>`；拒绝覆盖非空目录。
- 旧 import.* ID 已收敛，映射在 inventory；如曾手动安装旧包，应先禁用旧实例，避免新旧服务并存；不自动改用户 registry。
- 262 个远程来源尚无本地源码，未作为本地插件计数。

## 插件展示

Manifest 的 name / description 用于列表与详情，presentation 引用包内原图标、可选暗色图标、预览图和 CoTree README。缺少原图时使用默认图标，查看不启用插件。安全审查家族保持原状。展示信息与完整兼容、认证验收分别记录；格式与使用方式见 [Plugin SDK](../../docs/plugin-sdk-manual/03-plugin-manifest-reference.md#包内展示内容)。

## 分类与逐包状态

| 插件 | 分类 | 优先级 / 批次 | 完整度 | 合并来源数 | Skill / Agent / MCP |
| --- | --- | --- | --- | ---: | --- |
| [前端设计](cotree.frontend-design/README.md) | 开发与质量 | P0 / 1 | native-adapted | 1 | 1 / 0 / 0 |
| [代码审查](cotree.code-review/README.md) | 开发与质量 | P0 / 1 | native-adapted | 3 | 2 / 6 / 0 |
| [Git 工作流](cotree.git-workflow/README.md) | 开发与质量 | P0 / 1 | native-adapted | 1 | 3 / 0 / 0 |
| [开发工作流](cotree.development-workflow/README.md) | 开发与质量 | P0 / 2 | native-adapted | 2 | 10 / 0 / 0 |
| [Context7](cotree.context7/README.md) | 开发与质量 | P0 / 2 | native-adapted | 1 | 1 / 0 / 1 |
| [Playwright](cotree.playwright/README.md) | 开发与质量 | P0 / 2 | native-adapted | 1 | 1 / 0 / 1 |
| [GitHub](cotree.github/README.md) | 代码托管与部署 | P0 / 3 | native-adapted | 2 | 5 / 0 / 1 |
| [Linear](cotree.linear/README.md) | 团队协作与知识 | P0 / 3 | native-adapted | 2 | 4 / 0 / 1 |
| [项目指令](cotree.project-instructions/README.md) | 开发与质量 | P0 / 3 | native-adapted | 2 | 4 / 0 / 0 |
| [语言服务](cotree.language-services/README.md) | 开发与质量 | P0 / 4 | native-adapted | 12 | 3 / 0 / 0 |
| [插件开发](cotree.plugin-development/README.md) | 开发与质量 | P0 / 4 | native-adapted | 2 | 4 / 0 / 0 |
| [Skill 编写](cotree.skill-creator/README.md) | 开发与质量 | P0 / 4 | native-adapted | 1 | 3 / 0 / 0 |
| [Figma](cotree.figma/README.md) | 设计与内容 | P0 / 5 | native-adapted | 1 | 9 / 0 / 1 |
| [Notion](cotree.notion/README.md) | 团队协作与知识 | P0 / 5 | native-adapted | 1 | 5 / 0 / 1 |
| [Supabase](cotree.supabase/README.md) | 代码托管与部署 | P0 / 5 | native-adapted | 1 | 6 / 0 / 1 |
| [Sentry](cotree.sentry/README.md) | 代码托管与部署 | P0 / 6 | native-adapted | 1 | 4 / 0 / 1 |
| [Slack](cotree.slack/README.md) | 通信与日程 | P0 / 6 | native-adapted | 1 | 6 / 0 / 1 |
| [Vercel](cotree.vercel/README.md) | 代码托管与部署 | P0 / 6 | native-adapted | 1 | 25 / 0 / 1 |
| [Gmail](cotree.gmail/README.md) | 通信与日程 | P0 / 7 | native-adapted | 1 | 6 / 0 / 1 |
| [Google Drive](cotree.google-drive/README.md) | 团队协作与知识 | P0 / 7 | native-adapted | 1 | 8 / 0 / 1 |
| [Stripe](cotree.stripe/README.md) | 数据与商业 | P0 / 7 | native-adapted | 1 | 10 / 0 / 1 |
| [网页开发](cotree.build-web-apps/README.md) | 开发与质量 | P0 / 8 | native-adapted | 1 | 4 / 0 / 0 |
| [MCP 服务开发](cotree.mcp-server-dev/README.md) | 开发与质量 | P0 / 8 | native-adapted | 1 | 5 / 0 / 0 |
| [产品设计](cotree.product-design/README.md) | 设计与内容 | P0 / 8 | native-adapted | 1 | 8 / 0 / 0 |
| [网页数据可视化](cotree.build-web-data-visualization/README.md) | 数据与商业 | P0 / 9 | native-adapted | 1 | 18 / 0 / 0 |
| [数据分析](cotree.data-analytics/README.md) | 数据与商业 | P0 / 9 | native-adapted | 1 | 12 / 0 / 1 |
| [PostHog](cotree.posthog/README.md) | 数据与商业 | P0 / 9 | native-adapted | 1 | 6 / 0 / 1 |
| [Asana](cotree.asana/README.md) | 团队协作与知识 | P0 / 10 | native-adapted | 1 | 6 / 0 / 1 |
| [Atlassian Rovo](cotree.atlassian-rovo/README.md) | 团队协作与知识 | P0 / 10 | native-adapted | 1 | 6 / 0 / 1 |
| [ClickUp](cotree.clickup/README.md) | 团队协作与知识 | P0 / 10 | native-adapted | 1 | 7 / 0 / 1 |
| [Google Calendar](cotree.google-calendar/README.md) | 通信与日程 | P0 / 11 | native-adapted | 1 | 6 / 0 / 1 |
| [Outlook Calendar](cotree.outlook-calendar/README.md) | 通信与日程 | P0 / 11 | native-adapted | 1 | 6 / 0 / 0 |
| [Outlook Email](cotree.outlook-email/README.md) | 通信与日程 | P0 / 11 | native-adapted | 1 | 6 / 0 / 0 |
| [Airtable](cotree.airtable/README.md) | 团队协作与知识 | P0 / 12 | native-adapted | 1 | 7 / 0 / 1 |
| [Dropbox](cotree.dropbox/README.md) | 团队协作与知识 | P0 / 12 | native-adapted | 1 | 9 / 0 / 1 |
| [monday.com](cotree.monday-com/README.md) | 团队协作与知识 | P0 / 12 | native-adapted | 1 | 8 / 0 / 1 |
| [Cloudflare](cotree.cloudflare/README.md) | 代码托管与部署 | P0 / 13 | native-adapted | 1 | 11 / 0 / 1 |
| [Firebase](cotree.firebase/README.md) | 代码托管与部署 | P0 / 13 | native-adapted | 1 | 10 / 0 / 1 |
| [GitLab](cotree.gitlab/README.md) | 代码托管与部署 | P0 / 13 | native-adapted | 1 | 8 / 0 / 1 |
| [CircleCI](cotree.circleci/README.md) | 代码托管与部署 | P0 / 14 | native-adapted | 1 | 7 / 0 / 0 |
| [Datadog](cotree.datadog/README.md) | 代码托管与部署 | P0 / 14 | native-adapted | 1 | 7 / 0 / 1 |
| [Terraform](cotree.terraform/README.md) | 代码托管与部署 | P0 / 14 | native-adapted | 1 | 8 / 0 / 1 |
| [Canva](cotree.canva/README.md) | 设计与内容 | P0 / 15 | native-adapted | 1 | 10 / 0 / 1 |
| [SharePoint](cotree.sharepoint/README.md) | 团队协作与知识 | P0 / 15 | native-adapted | 1 | 7 / 0 / 0 |
| [Microsoft Teams](cotree.teams/README.md) | 通信与日程 | P0 / 15 | native-adapted | 1 | 7 / 0 / 0 |
| [Consensus](cotree.consensus/README.md) | 研究与专业工具 | P0 / 16 | native-adapted | 1 | 7 / 0 / 1 |
| [Granola](cotree.granola/README.md) | 团队协作与知识 | P0 / 16 | native-adapted | 1 | 6 / 0 / 1 |
| [Zotero](cotree.zotero/README.md) | 团队协作与知识 | P0 / 16 | native-adapted | 1 | 8 / 0 / 0 |
| [Expo](cotree.expo/README.md) | 开发与质量 | P0 / 17 | native-adapted | 1 | 13 / 0 / 0 |
| [Laravel Boost](cotree.laravel-boost/README.md) | 代码托管与部署 | P0 / 17 | native-adapted | 1 | 6 / 0 / 1 |
| [Remotion](cotree.remotion/README.md) | 设计与内容 | P0 / 17 | native-adapted | 1 | 11 / 0 / 0 |
| [Serena](cotree.serena/README.md) | 开发与质量 | P0 / 18 | native-adapted | 1 | 6 / 0 / 1 |
| [Temporal](cotree.temporal/README.md) | 代码托管与部署 | P0 / 18 | native-adapted | 1 | 10 / 0 / 0 |
| [Android 应用测试](cotree.test-android-apps/README.md) | 开发与质量 | P0 / 18 | native-adapted | 1 | 8 / 0 / 0 |
| [Game Studio](cotree.game-studio/README.md) | 开发与质量 | P0 / 19 | native-adapted | 1 | 9 / 0 / 0 |
| [HyperFrames](cotree.hyperframes/README.md) | 设计与内容 | P0 / 19 | native-adapted | 1 | 8 / 0 / 0 |
| [Playground](cotree.playground/README.md) | 设计与内容 | P0 / 19 | native-adapted | 1 | 6 / 0 / 0 |
| [MagicPath](cotree.magicpath/README.md) | 设计与内容 | P0 / 20 | native-adapted | 1 | 7 / 0 / 0 |
| [Mixpanel Headless](cotree.mixpanel-headless/README.md) | 数据与商业 | P0 / 20 | native-adapted | 1 | 7 / 0 / 0 |
| [会话分析](cotree.session-insights/README.md) | 开发与质量 | P0 / 20 | native-adapted | 2 | 3 / 0 / 0 |
| [Agent SDK Dev](cotree.agent-sdk-dev/README.md) | 开发与质量 | P0 / 21 | native-adapted | 1 | 4 / 2 / 0 |
| [OpenAI Developers](cotree.openai-developers/README.md) | 研究与专业工具 | P0 / 21 | native-adapted | 1 | 8 / 0 / 0 |
| [教学与解释](cotree.teaching/README.md) | 研究与专业工具 | P0 / 21 | native-adapted | 2 | 3 / 0 / 0 |
| [CodeRabbit](cotree.coderabbit/README.md) | 开发与质量 | P0 / 22 | native-adapted | 1 | 3 / 0 / 0 |
| [竞赛数学](cotree.math-olympiad/README.md) | 研究与专业工具 | P0 / 22 | native-adapted | 1 | 3 / 0 / 0 |
| [数学证明](cotree.math-proof/README.md) | 研究与专业工具 | P0 / 22 | native-adapted | 1 | 3 / 2 / 0 |
| [Shopify](cotree.shopify/README.md) | 数据与商业 | P0 / 23 | native-adapted | 1 | 7 / 0 / 1 |
| [Twilio Developer Kit](cotree.twilio-developer-kit/README.md) | 通信与日程 | P0 / 23 | native-adapted | 1 | 12 / 0 / 0 |
| [Zoom](cotree.zoom/README.md) | 通信与日程 | P0 / 23 | native-adapted | 1 | 12 / 1 / 1 |
| [Boltz](cotree.boltz-api-cli/README.md) | 研究与专业工具 | P0 / 24 | native-adapted | 1 | 8 / 0 / 0 |
| [生命科学研究](cotree.life-science-research/README.md) | 研究与专业工具 | P0 / 24 | native-adapted | 1 | 12 / 0 / 0 |
| [NGS 测序分析](cotree.ngs-analysis/README.md) | 研究与专业工具 | P0 / 24 | native-adapted | 1 | 13 / 0 / 0 |
| [Apple 应用开发](cotree.apple-development/README.md) | 开发与质量 | P0 / 25 | native-adapted | 2 | 14 / 0 / 1 |
| [cwc-makers](cotree.cwc-makers/README.md) | 研究与专业工具 | P0 / 25 | native-adapted | 1 | 4 / 0 / 0 |
| [nvidia](cotree.nvidia/README.md) | 研究与专业工具 | P0 / 25 | native-adapted | 1 | 11 / 0 / 0 |
| [code-modernization](cotree.code-modernization/README.md) | 开发与质量 | P0 / 26 | native-adapted | 1 | 6 / 0 / 0 |
| [example-plugin](cotree.example-plugin/README.md) | 开发与质量 | P0 / 26 | native-adapted | 1 | 2 / 0 / 0 |
| [hookify](cotree.hookify/README.md) | 开发与质量 | P0 / 26 | native-adapted | 1 | 2 / 0 / 0 |
| [ralph-loop](cotree.ralph-loop/README.md) | 开发与质量 | P0 / 26 | native-adapted | 1 | 3 / 0 / 0 |
| [discord](cotree.discord/README.md) | 通信与日程 | P0 / 27 | native-adapted | 1 | 4 / 0 / 0 |
| [fakechat](cotree.fakechat/README.md) | 通信与日程 | P0 / 27 | native-adapted | 1 | 2 / 0 / 0 |
| [imessage](cotree.imessage/README.md) | 通信与日程 | P0 / 27 | native-adapted | 1 | 3 / 0 / 0 |
| [telegram](cotree.telegram/README.md) | 通信与日程 | P0 / 27 | native-adapted | 1 | 3 / 0 / 0 |
| [lovable](cotree.lovable/README.md) | 设计与内容 | P0 / 28 | native-adapted | 1 | 4 / 0 / 1 |
| [mcp-tunnels](cotree.mcp-tunnels/README.md) | 开发与质量 | P0 / 28 | native-adapted | 1 | 2 / 0 / 0 |
| [project-artifact](cotree.project-artifact/README.md) | 设计与内容 | P0 / 28 | native-adapted | 1 | 3 / 0 / 0 |
| [adobe](cotree.adobe/README.md) | 设计与内容 | P0 / 29 | native-adapted | 1 | 7 / 0 / 0 |
| [chatcut](cotree.chatcut/README.md) | 设计与内容 | P0 / 29 | native-adapted | 1 | 2 / 0 / 1 |
| [creative-production](cotree.creative-production/README.md) | 设计与内容 | P0 / 29 | native-adapted | 1 | 4 / 0 / 0 |
| [higgsfield](cotree.higgsfield/README.md) | 设计与内容 | P0 / 29 | native-adapted | 1 | 5 / 0 / 1 |
| [openai-ads-conversions](cotree.openai-ads-conversions/README.md) | 数据与商业 | P0 / 30 | native-adapted | 1 | 4 / 0 / 0 |
| [public-equity-investing](cotree.public-equity-investing/README.md) | 数据与商业 | P0 / 30 | native-adapted | 1 | 15 / 0 / 0 |
| [安全审查](cotree.security-review/README.md) | 开发与质量 | P1 | integration-pending | 3 | 2 / 4 / 0 |

## 认证跟进

[HTML 跟进清单](auth-followup.html)列出已知认证绑定与待确认账户入口；人工状态和真实证据分开。用 pnpm exec tsx scripts/update-plugin-auth-followup.mts 刷新，不读取凭据。

## 去重边界

同服务的 GitHub / Linear 只注册一个 MCP；同一家族的重复 Skill / Agent 内容按实际定义核对。PostgreSQL 最佳实践已统一到 Supabase optimize，网页开发包的旧版本只留参考。React / shadcn 已归并到 Vercel react / ui，八份互补 shadcn 参考随 Vercel 包独立保留并记录来源摘要；Stripe 最佳实践统一到 Stripe integrate，旧版本只归档。未决同名技能审查：0 组，见 [组件重叠记录](component-overlaps.json)。已有 CoTree Telegram / Browser Use 的重叠情况写在对应包里，后续优先复用现有执行能力。参考资源不是额外插件实例。
