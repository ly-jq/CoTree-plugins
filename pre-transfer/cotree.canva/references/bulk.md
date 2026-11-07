# 离线批量规划

Node.js 22+：node scripts/bulk-plan.mjs --input mapping.json --output new-plan.json。此脚本不读取凭据、不请求网络、不生成设计；输出是 CoTree 规范化计划，需转换成已发现的实际 MCP schema。最多 200 行、100 个字段、输入 1 MiB；输出拒绝覆盖。

输入示例（字段来自实际模板，示例 ID 不可直接提交）：

```json
{"templateId":"OBSERVED_TEMPLATE_ID","fields":[{"name":"Headline","type":"text","column":"title"},{"name":"Photo","type":"image","column":"asset"}],"titleColumn":"title","rows":[{"title":"春季活动","asset":"OBSERVED_ASSET_ID"}]}
```

字段必须准确匹配，不模糊猜测；数字 0 和 false 转成正文，null / 空串 / 缺值不填，全部为空的行记为 skipped。图片只接受已上传 asset ID，不把 URL 当 ID；图表不在此脚本范围，按实际 schema 另行处理。planned 中 row 是从 1 开始的输入行号。输出 execution:not-started 永远不是生成成功证据。真正提交后另记 job ID、design ID、结果与导出状态，遇到未知状态先查后重试。
