# zoom Webhook starter

独立目标应用样例，与 CoTree kernel / 会话存储无关。Node 20+；仅使用 Node 标准库，无第三方依赖。npm run check 检查语法。按 .env.example 用受控环境传入值，样例不自动读取 .env；npm start 只绑定 127.0.0.1，POST /webhook，最大 body 1 MiB。不会连接远程账户、发送消息、发起呼叫、创建会议或配置公网隧道。

按原始字节验证 v0 HMAC，拒绝缺失 / 超出5分钟的时间戳，恒时比较签名；签名通过才处理 endpoint.url_validation 的挑战，否则只确认接收并标 businessProcessed:false。

这是协议验证样例，尚无业务存储、队列、幂等或生产TLS。签名不是业务完成证明，也不是持久重放保护。接入生产前用当前应用已有存储保存真实事件标识 / 投递摘要和处理结果，先持久接收再确认并处理，处理乱序 / 重投。配置可信 HTTPS 反代、速率 / 大小上限、最小事件订阅与脱敏日志；记录真实服务回调证据。测试夹具不能证明账号、发布与真实投递通过。

官方合同：https://developers.zoom.us/docs/api/webhooks/
