# OpenAI Ads 独立接入

2026-10-14核对官方：[Pixel](https://developers.openai.com/ads/measurement-pixel)、[CAPI](https://developers.openai.com/ads/conversions-api)、[事件](https://developers.openai.com/ads/supported-events)。原资料保留用于历史，不覆盖新合同。CAPI新增/现行复数用户数组phone_numbers_sha256/emails_sha256/external_ids_sha256/first_names_sha256/last_names_sha256、regions/postal_codes/cities/countries；user.obref是浏览器__obref原值，事件oppref是__oppref原值。两者都不能伪造、解码或写日志。Pixel仍用单值匹配字段；consent需在init前与站点规则一致，撤销停止未来事件。

Node20+服务器helper：node scripts/ads-conversions.mjs validate|validate-remote|send request.json。输入pixelId、measurementAllowed(来自应用许可状态)、trustedOrigins(明确origin数组)、events，可选integration_source。每事件id/type/timestamp_ms/action_source/data；web必须source_url。validate零网络/零凭据，CLI只报告数量/类型；validate-remote仍是外发请求但不保存事件，需独立账户；send生产默认validate_only:false。OPENAI_ADS_CONVERSIONS_API_KEY只走进程环境/现有secret系统，不是模型API key或Advertiser管理key。固定HTTPS、拒绝重定向、10秒上限、不自动写重试，响应不回显请求体。

字段按最新schema校验；helper保守限定非负金额/数量、ISO4217币种、user数组1–3项，未覆盖新增字段需先核对官方文档再扩展。金额使用币种最小单位（JPY非固定除100）；内容单价乘quantity与事件总价分开。时间为过去7天到未来10分钟，批次≤1000且任一错误可导致整批拒绝。自定义字段仅data.type=custom，应用仍应最小化数据。

实际登录、额度/账户准入、validate-only请求、近期接收与归因未验收。此迁移只运行离线协议/浏览器SDK stub，不创建Pixel、密钥或发送事件。原完整框架提示、报告schema和检查资料保留resources/source-01/content/skills/openai-ads-conversions-setup/references。
