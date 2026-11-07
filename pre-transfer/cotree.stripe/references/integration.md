# 支付集成与验证

cotree.stripe.integrate 统一承担 Stripe 最佳实践，网页开发旧副本不再注册。六份较新的领域参考保留在 resources/source-01/content/skills/stripe-best-practices/references/；旧版仍归档于网页开发包。参考是来源快照，不能直接升级 SDK / API 或创建沙箱账户。

先读当前系统，再选支付 API、客户端 / 服务端边界和数据存储。使用最小权限凭据，不将 secret 放前端；核对 currency、整数金额单位及特定货币 / payout 例外，避免浮点算金额。支付完成依据服务端对象和已验证事件，订阅权益处理重试、乱序、退款及失败恢复。税注册、地域和金融产品资格要有实际证据，不用参数开启替代外部完成。

随包离线工具：node scripts/verify-webhook.mjs --payload raw-event.json --signature 真实Stripe-Signature。COTREE_STRIPE_WEBHOOK_SECRET 为该 endpoint 签名 secret，绝非 MCP key。签名前不解析 / 重序列化 payload；检查 t 与 v1、多签名轮换、时间窗口及原始 bytes。默认最多 300 秒，输入最多 1 MiB，结果只含 event ID / type / livemode / API version / hash。signatureVerified 不是 processed；项目现有 durable store 必须按 event ID 防重放并验证业务状态。

本工具只帮助本地诊断，不代替项目现有 Stripe SDK 的 Webhook handler。部署前用 SDK 与真实沙箱投递验证路由、原始 body、中间件、密钥版本、响应和幂等；日志不得包含 payload 中不必要的个人数据或密钥。

参考：[Webhook 签名](https://docs.stripe.com/webhooks/signature)、[API 版本](https://docs.stripe.com/api/versioning)、[幂等请求](https://docs.stripe.com/api/idempotent_requests)。
