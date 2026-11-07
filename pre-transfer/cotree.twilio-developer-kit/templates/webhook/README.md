# twilio Webhook starter

独立目标应用样例，与 CoTree kernel / 会话存储无关。Node 20+；在本目录 npm install 安装固定 twilio 6.2.0 并保留 lock。npm run check 检查语法。按 .env.example 用受控环境传入值，样例不自动读取 .env；npm start 只绑定 127.0.0.1，POST /webhook，最大 body 1 MiB。不会连接远程账户、发送消息、发起呼叫、创建会议或配置公网隧道。

以官方 SDK validateRequest 校验 form 编码请求的完整参数和精确 HTTPS URL。允许固定查询串，需与实际配置一致；不要从 Host / Forwarded 猜 URL。多值参数保留为数组。签名通过返回空 MessagingResponse，不自动回复。JSON bodySHA256 应另用 SDK validateRequestWithBody；SendGrid 有独立验证协议，本样例返回415而不冒用form验证。

这是协议验证样例，尚无业务存储、队列、幂等或生产TLS。签名不是业务完成证明，也不是持久重放保护。接入生产前用当前应用已有存储保存真实事件标识 / 投递摘要和处理结果，先持久接收再确认并处理，处理乱序 / 重投。配置可信 HTTPS 反代、速率 / 大小上限、最小事件订阅与脱敏日志；记录真实服务回调证据。测试夹具不能证明账号、发布与真实投递通过。

官方合同：https://www.twilio.com/docs/usage/webhooks/webhooks-security
