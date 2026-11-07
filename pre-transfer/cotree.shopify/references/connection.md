# Shopify 接入与验证

核对日期：2026-10-14。官方 [AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) 已合并旧独立技能；[Dev MCP](https://www.npmjs.com/package/@shopify/dev-mcp) 固定1.16.0、无店铺认证。首次 npx 会获取依赖，需符合宿主网络 / Shell 权限；不隐式全局安装。OPT_OUT_INSTRUMENTATION=true 关闭服务的可选上报，不改变必要文档请求。1.16.0实际目录为learn_shopify_api、search_docs_chunks、validate、validate_theme及feedback；不自动调用feedback，不填可选user_prompt / model。

本地运行：node scripts/shopify-validate.mjs --api admin --file 查询文件。api 可为 admin / customer / partner / payments-apps / storefront-graphql。包装器传绝对路径、只允许1MiB普通文件、30秒超时，清除用户凭据 / NODE_OPTIONS / staging与遥测覆盖环境。输出是来源2026-04 schema的校验结果；当前实际API版本必须另核对。任何校验均不执行mutation。

商家操作使用官方 [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) 与独立账户，在指定store只读核对身份后才执行授权修改。原 setup.shopify.com/mcp 与来源宿主client占位不注册；其商家接入目标由CLI流程承接，不声称旧连接器已接通。UCP CLI 是另外的买家交易能力；当前官方版本、商家协议、profile及实际支付交接分别验收，不静默购买。

账户验收：工具/CLI版本 → 独立登录 → store/权限读取 → 指定开发店铺可逆修改并回查 → 过期/撤销。正式主题、订单、支付和发布不由离线验证授权。
