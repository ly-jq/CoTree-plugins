# 结构化筛选

先读实际工具的 filters schema 和目标 table fields。条件为 operator / operands，第一项为字段 ID；顶层是 AND / OR 组，默认 AND。mixed AND / OR 使用嵌套组，不把多个查询结果简单相加。选择字段匹配 choice ID；日期条件为模式对象并包含 timeZone。interface 页面原有过滤仍会与新增条件相交。

常见运算符和类型、group membership 与日期示例完整保留在 [来源筛选参考](../resources/source-01/content/skills/airtable-filters/SKILL.md)。来源 CLI 示例可能接受字段名，本包先解析到唯一字段 ID；sort 的字段参数按实际 schema，不能把 fieldId 与 field 混用。筛选值与写入值编码不同。

可用 Node.js 22+ 执行 node scripts/airtable-filter.mjs --input schema-and-filter.json [--output new-file.json]。路径相对 pluginRootDir。输入为 {"fields":[{"id":"fldStatus","name":"Status","type":"singleSelect","options":{"choices":[{"id":"selDone","name":"Done"}]}}],"filters":{"operands":[{"operator":"=","operands":["Status","selDone"]}]}}。示例 ID 不是账户对象；使用实际读取的 fields。输出的 filters 才是提交候选，其余 metadata 不传给远端。

本地准备器拒绝歧义字段、未知 choice、错误类型、超出 8 层 / 100 条件 / 256 KiB 输入及覆盖输出；不联网、不读凭据、不更改原输入。computed 类型需 options.result.type。日期 mode 与额外属性按真实远端 schema 核实，本地只保留和检查模式 / IANA 时区，不宣称验证全部新模式；自定义算子可直接走实际工具 schema。preparedOffline=true 与 verifiedByService=false 不证明远端查询成功。
