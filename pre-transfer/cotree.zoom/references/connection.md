# Zoom 接入

核对日期2026-10-14。[官方MCP注册](https://github.com/zoom/mcp-registry/blob/main/zoom-meetings/server.json)发布 https://mcp.zoom.us/mcp/meeting/streamable；[认证概述](https://developers.zoom.us/docs/mcp/servers/)要求独立OAuth/PKCE。原client_id占位与连接器身份不迁移。完整 Bearer token header经COTREE_ZOOM_MCP_AUTHORIZATION受控注入；不要写入包或报告。OAuth注册、账户/管理员准入、scopes、刷新和撤销另行验证，本包不实现token签发或刷新。

Meetings实际工具集通过tools/list发现，先指定会议只读核对；SDK、REST、RTMS、Phone等是目标应用自己的开发能力，不能声称MCP已支持全部产品。参考资料按目标SDK版本与[官方开发文档](https://developers.zoom.us/docs/)核实。

node scripts/create-webhook.mjs --output 新目录 生成无依赖Node样例。ZOOM_WEBHOOK_SECRET_TOKEN仅用于该样例，不能代替MCP OAuth。按[Webhook合同](https://developers.zoom.us/docs/api/webhooks/)处理原始body、签名、时间窗和CRC挑战；模板不持久化业务或防止所有重投，不自动发布公网端点。

真实验收：独立客户端/用户OAuth → 账户及必要scope → 指定会议/资产读取 → 授权测试集成 → 错误/过期/撤销。录制、转录、SDK平台和租户套餐另验；本地HMAC和协议夹具不能证明远程业务。
