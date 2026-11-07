# __APP_NAME__

本地 MCP Apps 示例，无模型或账户调用。npm install → npm run check → npm run build → npm start；默认 http://127.0.0.1:8787/mcp，PORT 可配置。构建把固定版官方 App bridge 打包进 dist/widget.html，无 CDN。show_message 仅返回输入文字，声明 input / outputSchema 与四个准确 hints。

服务仅监听 loopback，限制 Host、拒绝 Origin；/health 与 /mcp 是唯一路由，后者仅 POST、无会话。适合本机协议测试，不能直接用公网 tunnel 暴露。远程部署需按官方指南实现 HTTPS / OAuth / Origin / 租户隔离和目标域 CSP，再连接 ChatGPT。此包不伪造客户端准入、提交审核或 ChatGPT 真实渲染。独立打开 widget 时显示需要宿主；通过 MCP Apps host 完成初始化、结果通知和 tools/call。

参考：https://developers.openai.com/plugins/build/app-quickstart 与 https://developers.openai.com/plugins/build/mcp-server 。
