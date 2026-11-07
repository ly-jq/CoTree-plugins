# ChatCut Desktop

官方npm bridge固定chatcut-desktop-mcp@0.1.1，Node>=18，包只委派签名Desktop生成的用户launcher，不包含视频引擎。默认不设置CHATCUT_DESKTOP_MCP_LAUNCHER；该变量仅供显式隔离测试，不能给生产插件任意可执行路径。

官方安装包：macOS arm64 https://api.chatcut.io/desktop/download/macos；macOS Intel /macos-x64；Windows x64 /windows。Mac13+、Windows x64，Linux暂不支持；macOS/Windows签名由系统验证，禁止绕过失败的签名/隔离保护。打开应用以生成launcher，用户自行登录。源技能让应用写Codex配置的部分不适用于CoTree，本包已有独立Manifest stdio注册。

调用前确认get_active_project，实际编辑能力来自签名应用；不能凭bridge安装成功宣称应用可用。真实Desktop/账户/视频项目未验收，隔离launcher夹具仅证明stdio和退出码传递。来源完整保留resources/source-01/content。官方包：[npm](https://www.npmjs.com/package/chatcut-desktop-mcp)，2026-10-14核对。
