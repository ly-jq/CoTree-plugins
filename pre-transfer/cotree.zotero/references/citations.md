# 引用计划与文件应用

node scripts/citation-plan.mjs --input request.json --output new-plan.json。离线、无凭据、不改草稿或库。输入包含 draft、bibliography、entry 三段原文、唯一 marker 与 format（latex / markdown）；每段最多 2 MiB，请求文件最多 8 MiB。entry 来自已确认条目的实际 BibTeX 导出，必须正好一条普通文献；不能把 Zotero itemKey 当 citekey。

解析花括号 / 圆括号条目、嵌套括号、转义与注释，不执行 TeX 或展开宏。citekey 限定字母、数字、下划线、冒号、点、加号、斜杠和横线；超出范围不猜转义，先通过正常书目流程处理。已有同键记录须文本完全相同，否则要求人工解决冲突。已有 bibliography 的字符串 / 前言 / 注释原样保留，但新增条目不能依赖未提供宏定义。

输出 execution:not-applied、draft / bibliography 新文本、citationKey 与两份 sourceHashes。用户已授权改稿时，用宿主文件工具核对原文件摘要后应用，保护后来的改动并读回。文件应用可能分两步，不视为文件系统事务；发生部分修改时明确记录并完成或恢复。
