# Boltz 接入和恢复

核对日期2026-10-14。官方[CLI仓库](https://github.com/boltz-bio/boltz-api-cli)和[0.43.0发布](https://github.com/boltz-bio/boltz-api-cli/releases/tag/v0.43.0)作为本批验证基线；Windows x64 zip的SHA256为93c7a08af46a319115dc7721a80bf44528065b875d3a77ccadc59252dd289eb5。下载时核对该release的checksums；不同平台用其自己的工件。官方[API文档](https://api.boltz.bio/docs)和当前help校准请求，不自动升级。

独立auth status / auth login --device-code，或受控BOLTZ_API_KEY。status仅本地身份检查；实际组织、额度、估价和任务需单独验收。OAuth由官方CLI管理，不复制来源宿主client、配置目录或凭据。

Node 20+规划工具（只写本地计划，不执行CLI）：

1. 输入JSON：resource（六种明确API resource之一）、payload（绝对JSON文件路径）、runName（幂等key）、outputRoot（绝对路径）。
2. node scripts/boltz-job.mjs prepare input.json new-plan.json：拒绝覆盖，保存payload SHA256和独立estimateCost / start argv。
3. 在官方CLI核实schema和真实估价，按当前任务授权核对预算；提交前 node scripts/boltz-job.mjs verify new-plan.json。不要把输出argv拼成未经转义的shell字符串。
4. 保存服务真实job ID后，将resource、id、原runName/outputRoot写入恢复JSON；node scripts/boltz-job.mjs resume recovery.json 输出retrieve / download-status / download-results，无start。

当前CLI支持范围按help确定，来源ADME无下载步骤的旧说明已过时。工具不上传payload，不自动登录、估价、启动付费计算或注册定时器；文件摘要不是API schema验证。重提需要区分真正新任务与已接受但响应丢失的请求；不能盲目换幂等key。完成报告同时核对远端终态、下载完整性、实际文件与科学解释。

蛋白设计附带的五项分析工具和_common.py / requirements在原目录保留；先在隔离环境检查当前help与依赖，再使用明确输出路径。尚未验证账户、付费任务、真实分子、其他OS或全部科学辅助脚本。
