# Firebase 接入

服务 cotree.firebase.firebase 通过 stdio 启动 npx -y firebase-tools@15.32.1 mcp --only auth,firestore,storage，cwdBase=workspace。core 始终可用，包括会写入的工具；功能过滤不是最小 IAM 或只读限制。本包不创建全局 CLI、服务器镜像或第二套代理。

Node.js 22+ / npm。首次启动可能下载 npm 依赖，需本地网络 / 缓存；固定版本来源 2026-10-06 核实。个人用独立 Firebase CLI 登录，自动化可用 ADC / Workload Identity 等最小 IAM 身份。GOOGLE_APPLICATION_CREDENTIALS 是 ADC 文件路径（若选择文件路径方式），不是本包新增 token 绑定；默认 stdio 环境不会保证转发任意宿主变量，需按正常 MCP env / 凭据配置显式提供。CLI 登录和 ADC 优先级按实际 Firebase 结果，不能推断当前账号。

## 固定项目范围

先在指定项目检查 firebase.json 和 .firebaserc；不要自动修改 active alias 或用户登录。运行 node scripts/connection-config.mjs --project-dir <实际绝对目录> --only auth,firestore,storage。脚本验证目录 / firebase.json 存在与支持的功能组；生成 --dir 和同一 cwd。它不解析或改写项目配置，不验证 project ID / IAM。固定版本的 mcp 命令不接受普通 CLI 的 --project 参数；项目 ID 由目录配置 / 持久环境决定，必须从 firebase_get_environment / get_project 读回核实，持久客户端设置可能优先于 --dir。

配置脚本通过现有 Shell 权限运行，Node.js 22+；路径相对 pluginRootDir。只向 stdout 输出 JSON，不联网、不读凭据、不写用户配置。将输出的同名项通过项目正常配置流程合并到 .cotree/mcp.json 的 mcpServers，保留其他服务；同名覆盖原插件服务，不能换名重复注册。工作区覆盖独立于插件生命周期，停用 / 卸载插件时也需移除覆盖。不要直接修改有完整性摘要的 plugin.json。

其他功能组：core、database、dataconnect、functions、messaging、remoteconfig、crashlytics、apptesting、apphosting、developerknowledge。后者可能发现远端扩展，单独验收；版本升级先检查新 schema，不能把当前组名清单当永久协议。空串、重复或错拼组被拒绝，避免上游忽略无效组而退回自动发现。

切换目录 / 项目后重新确认身份和只读对象，再执行已授权写入。退出共享 CLI 登录会影响其他客户端，不能作为本包自动清理。模拟器与生产 endpoint 分别验证；本包不保证所有 MCP 工具都走模拟器。

[官方 MCP](https://firebase.google.com/docs/ai-assistance/mcp-server)、[CLI 身份](https://firebase.google.com/docs/cli#cli-ci-systems)、[模拟器](https://firebase.google.com/docs/emulator-suite)。本批没有自动登录、获取 token、绑定计费或访问真实项目。
