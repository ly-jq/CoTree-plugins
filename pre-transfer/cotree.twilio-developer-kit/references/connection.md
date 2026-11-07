# Twilio 接入

核对日期2026-10-14。[官方Node SDK](https://github.com/twilio/twilio-node)样例固定6.2.0，Node20+。账户/子账户、API key、Auth Token与SendGrid key独立。TWILIO_ACCOUNT_SID / TWILIO_API_KEY / TWILIO_API_SECRET用于目标应用按文档调用；TWILIO_AUTH_TOKEN用于账户或回调验签；SENDGRID_API_KEY另行限制权限。这些是目标应用受控环境入口，不读取其他宿主凭据。

先核对身份与发送者，只读查询指定测试对象。真实发送、拨号、OTP与批量邮件会产生外部副作用和费用，需要用户指定目标和范围。API接受、运营商投递与业务完成分开记录。法务/注册/产品准入资料以当前官方规则复核。

node scripts/create-webhook.mjs --output 新目录 生成完整可编辑样例；不覆盖已有目录、自动安装依赖或启动服务。按生成README完成本地协议验证，再安排受控真实回调、事件重投与过期/撤销。完整form参数与URL由[官方验签合同](https://www.twilio.com/docs/usage/webhooks/webhooks-security)约束；不将Auth Token打印在argv或报告。
