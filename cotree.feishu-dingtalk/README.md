# 飞书与钉钉 · CoTree 独立插件

0.2 提供配置面板和宿主管理的消息服务。导入插件后，可以在界面填写凭据、选择工作区、检查连接、启动和停止接入，**不需要打开终端、编辑配置文件或手动运行脚本**。无需修改或重新编译 CoTree 主体。

0.2.1 增加飞书机器人 Open ID 的 **自动获取**：填写 App ID、App Secret 后点击按钮即可，不需要 API 调试台或手动查询 Token。

0.2.2 补充飞书长连接失败诊断：显示中文状态、平台错误分类和恢复建议，保留安全的数字错误码，不展示密钥或连接票据。应用状态或密钥修正后，若原连接已进入「连接失败」，点击 **停止服务**再**启动服务**重新建立连接。

支持飞书应用机器人和钉钉企业内部机器人的单聊、群聊 @、文本任务投递、最终结果回传、会话隔离、持久去重和异常投递恢复。CoTree 仍使用原模型、Agent 和审批规则。图片、文件、语音、卡片操作和聊天内工具审批不在本版本范围。

## 安装与打开

1. 在 CoTree 插件管理中导入本插件 ZIP，启用 **飞书与钉钉**。
2. 点击左侧插件入口，或在命令面板搜索 **飞书与钉钉 · 配置与服务**，打开完整配置面板。
3. 本机需要 **Node.js 22.13 或更新版本**；后台程序由 CoTree 自动启动，包内已包含 JavaScript 依赖。若面板提示未找到 Node.js，安装后重启 CoTree 即可。

**请使用 Desktop v0.1.181 或更新版本。** v0.1.180 在某个项目工作区全局安装或升级插件后，其他已打开工作区可能保留旧计划，点击面板提示 `扩展视图不可用：cotree.feishu-dingtalk.panel`。v0.1.181 修复宿主跨工作区同步与旧面板清理；插件 0.2.2 本身不能替换宿主代码。更新 Desktop 后，后续插件升级无需反复退出应用，已有配置位置不变。暂时仍使用 v0.1.180 时，先完成运行任务，再从托盘完整退出并重开可临时恢复；刷新页面无效。

从 0.1 升级时，先停止旧版接入，再导入 0.2 并启用。新版增加 Custom View、Service 和固定命令原生进程权限，按 CoTree 插件管理界面完成版本启用。旧版 `~/.cotree/messaging/config.json` 和凭据文件保留；新版面板按工作区隔离配置，需要在面板重新填写。不要让同一机器人同时在旧版进程和新版面板中运行。

## 在面板完成配置

1. 在 **管理台 → 本机 Agent 接入**开启监听，按提示重启，为机器人创建一个独立来源 Key。
2. 在插件面板填写 **CoTree 地址**和**来源 Key**，点击 **检查连接并加载工作区**。选择已经在 CoTree 注册并配置模型的目标工作区。
3. 启用飞书、钉钉或两者，填写应用信息、密钥和允许使用的用户 ID。可在“群聊范围与接收方式”中限制聊天范围。
4. 点击 **保存配置**，或直接点击 **启动服务**。启动会先保存当前配置。查看每个平台的“连接中 / 已连接 / 重新连接中”等状态。
5. 点击 **停止服务**结束消息接入。运行期间配置锁定，停止后可修改。

密钥输入框保存后清空，只显示“已配置”，不会回显原密钥；留空保留已有值，填写新值会替换。密钥通过本机插件服务通道保存，不经过模型工具、对话或 UI storage。检查连接仅验证 CoTree API，平台认证和收发权限要在启动后、通过实际消息确认。

允许用户列表每行填写一个精确 ID；**空列表拒绝所有用户**，不支持 `*`。聊天允许列表留空表示不额外限制聊天，但用户允许列表始终生效。

### 飞书

创建企业自建应用，开启机器人，订阅 `im.message.receive_v1`，选择长连接方式。申请单聊消息、群内 @ 消息接收及机器人发送消息所需权限，发布应用并将机器人加入目标群。

- App ID：应用的 `cli_…` ID。
- App Secret：应用密钥。
- 机器人 Open ID：填写上方 App ID、App Secret 后，点击旁边的 **自动获取**；成功后会自动填入，再点击 **保存配置**或**启动服务**。只用单聊时可以留空。
- 允许用户：发送者的 `open_id`，通常为 `ou_…`。

群聊默认仅接收明确 @ 此机器人的消息；未填写机器人 Open ID 时，这类群消息会被忽略。单聊不要求 @。回复使用消息回复接口，分段带稳定 `uuid`。

自动获取只需飞书应用凭据，CoTree 地址、来源 Key 和工作区尚未填写时也可查询。已保存此应用的密钥时，App Secret 留空会复用已有密钥；更换 App ID 后需填写对应密钥。查询不会保存配置或启动消息服务，也不会回显密钥和访问令牌。若提示无法获取机器人信息，先在飞书后台开启机器人能力并发布应用；仍支持手动填写 Open ID。

查询使用飞书官方[获取机器人信息接口](https://open.feishu.cn/document/client-docs/bot-v3/obtain-bot-info?lang=zh-CN)，无需额外 API 权限；能查到 ID 不代表消息接收与发送权限已配置完成。

参考：[官方 Node SDK](https://github.com/larksuite/node-sdk)、[飞书开放平台](https://open.feishu.cn/)。

### 钉钉

创建企业内部应用，开启机器人，接收模式选 **Stream**，发布并加入目标群，开通机器人单聊和群聊主动发送接口权限。

- Client ID / Client Secret：应用凭据。
- Robot Code：默认等于 Client ID；不同时单独填写。
- 允许用户：`senderStaffId`，即企业员工 `userId`。

只接收同企业且被允许的发送者；群聊默认必须 @ 机器人。使用公开 Stream 协议，每次重连申请新 ticket，消息落盘后才确认接收。回复使用应用消息 API，避免长任务超过临时 sessionWebhook 有效期。

参考：[Stream 协议](https://open-dingtalk.github.io/developerpedia/docs/learn/stream/protocol/)、[群消息接口](https://open.dingtalk.com/document/orgapp/the-robot-sends-a-group-message)、[单聊消息接口](https://open.dingtalk.com/document/orgapp/chatbots-send-one-on-one-chat-messages-in-batches)。

## 服务生命周期与恢复

- 关闭或切换插件面板后，已启动的消息服务继续运行。打开面板会读取实际服务状态，运行时每 5 秒刷新一次。
- 停止服务、停用/卸载插件或正常退出 CoTree 时，由现有服务 supervisor 回收后台进程。重启 CoTree 后需重新点击启动；本版本不提供开机自动连接。
- “服务运行中”表示消息工作循环已启动，平台是否连接成功以各平台状态为准。
- 飞书 SDK 的启动调用会先返回，实际连接结果由异步回调提供。平台返回终止性错误或重试耗尽时，0.2.2 会在飞书卡片显示原因；部分错误不会继续自动重连，修正配置后需要停止并重启服务。最初的 0.2.0/0.2.1 只显示 `failed`，未保存原因，无法追溯那次失败的具体错误码。
- 停止不会取消 CoTree 已受理任务；重新启动会恢复尚未完成的投递和结果回传。
- “最近投递”显示收据和错误码。修复来源或连接问题后可点击“重试投递”。回复结果未知时先核查原聊天，再点击“已核查，准备重发”和“确认重发（可能重复）”。
- 审批、补充信息和暂停任务在 CoTree 本机处理，插件不会代替来源 Key 批准工具。

每个 CoTree 工作区单独保存面板配置，位于用户目录的 `.cotree/messaging/workspaces/<工作区路径摘要>/`。其中 `config.json` 为非敏感配置，`credentials.json` 为私有凭据，`state/bridge.sqlite` 为消息和收据。它们不进入插件包或项目提交。一个机器人应只在一个工作区启动。

原始请求在首次 HTTP 投递前保存，超时和重启保持原正文与幂等键。平台、应用、聊天、线程及发送者共同区分会话。消息写入 SQLite 后才确认接收；待处理记录上限 1000。发回复前记录 `sending`，发送结果未知或崩溃中断后转为 `unknown`，不自动重发。

修改来源 Key、CoTree 地址或目标工作区后，旧状态不能跨身份复用（`STATE_SCOPE_CHANGED`）。先用原配置处理旧投递，再在新的 CoTree 工作区创建接入。不要通过删库重试结果未知的任务。去重收据不会自动清理；备份前停止服务并整体备份配置目录。

## Agent 工具与高级 CLI

面板和 Agent 工具共享同一个 Service 实例，避免重复启动桥接。工具仍包括 `messaging_status`、`messaging_configure`、`messaging_workspaces`、`messaging_start`、`messaging_stop`、`messaging_retry_input`、`messaging_retry_delivery`、`messaging_reply`。配置工具只接受非敏感配置；密钥在面板填写。补充回复只能发往已有消息的原聊天。

CLI 仅供高级独立部署使用，日常面板操作不需要执行这些命令：

```text
node dist/bridge.cjs init --config <私有config.json路径>
node dist/bridge.cjs check --config <私有config.json路径>
node dist/bridge.cjs run --config <私有config.json路径>
```

旧 CLI 默认目录仍为 `~/.cotree/messaging/`，支持相邻 `secrets.env`；面板保存的 `credentials.json` 优先于该文件，同名进程环境变量优先于二者。同一配置不能被两个进程同时启动。旧 stdio MCP 模式保留为高级 CLI 入口，0.2 的插件清单已改用 Code Tools + Service，不再自动注册独立 MCP 进程。

## 开发与验证

进入 `bridge/` 子目录：

```text
pnpm install --ignore-workspace --frozen-lockfile --ignore-scripts
pnpm --ignore-workspace typecheck
pnpm --ignore-workspace test
pnpm --ignore-workspace build
pnpm --ignore-workspace verify
pnpm --ignore-workspace verify:ui
```

独立锁文件使依赖不进入 CoTree 主体依赖树。构建使用仓库现有插件 SDK、校验和打包工具，输出自包含桥接程序、Service/Code Tool 入口、UI、依赖许可、ZIP 和 SHA-256。输出记录于 `.cotree/artifacts/feishu-dingtalk-plugin/latest.json`。

`verify` 在隔离目录安装 ZIP，通过真实 Service Supervisor、受限 Service Host 和 Native Process Broker 检查配置、凭据不回显、重载、HTTP 工作区查询和禁用清理。`verify:ui` 使用仓库 Desktop 的 Playwright/本机 Edge，验证真实面板和控制逻辑、明暗主题及窄窗口；平台适配器与模型结果使用合成测试实现。

`pnpm --ignore-workspace verify:desktop --executable <完整桌面安装程序路径>` 使用该程序自己的 renderer、Bridge、原生 WebContentsView 和 Service，通过正式导入/启用 API 安装插件，再点击界面入口。测试隔离 home、profile 和工作区，不访问用户凭据或连接真实平台。加 `--cross-workspace` 检查跨工作区全局启用；再加 `--upgrade-from <0.2.0 ZIP>` 检查面板打开期间跨工作区升级至当前包、旧原生面板回收、停用/重新启用及移除，全程不重启或刷新页面。`--recovery restart` 仅用于旧 v0.1.180 的故障恢复复现。报告与原生面板截图写入 artifacts 下的 `desktop-verification-*` 目录。

从仓库根目录执行 `pnpm exec vitest run tests/plugin-runtime/feishu-dingtalk-input-integration.test.ts` 可验证已有 Session API 的 HTTP、SQLite、幂等及来源撤销契约。真实飞书/钉钉租户权限和消息收发仍需填写应用凭据后联调，不能用这些测试替代。
