# 数据模型与访问范围

base 容纳关联的 tables；table 有 typed fields 和 records。稳定 field / record ID 优先于名字，primary field 是显示标识不必唯一。view 只改变显示 / 排序 / 过滤 / 隐藏配置；interface 为受众提供页面，页面访问不自动赋予整个 base 权限。automation 的触发和动作可能有外部副作用。

读 schema 时保留字段 type、choices、linked table、formula / rollup / lookup 的 result type。空值常以缺字段表示，不能统当空字符串、0 或 false。写入是否可用由工具 schema、用户及字段 / 表权限共同决定，synced 与 computed 字段不可据普通字段推断。

完整来源模型见 [归档数据模型](../resources/source-01/content/skills/airtable-overview/SKILL.md)，其来源宿主指令仅供追溯，不注册。实际操作使用本包技能和运行时工具。
