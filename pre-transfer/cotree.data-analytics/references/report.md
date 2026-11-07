# 离线报告

Node 22+，无需 npm 安装。插件根运行 node scripts/portable-report.mjs --input examples/report.json --output <已存在输出目录>/report.html。仅创建新文件，输入上限 3 MB；示例是合成数据，真实交付替换来源、数据、时间和单位。manifest 声明图形 / 表格 / blocks / filters，snapshot.datasets 保存记录，sources 保存实际查询与元数据。完整 schema 通过 MCP tools/list 读取，或见 ../resources/source-01/content/mcp/server.cjs 的 toolDefinitions。

完整压缩阅读器保留，canonical validator 后才构建。HTML 自包含、只读、渐进增强，看板有全局筛选栏，报告保留表格排序及既定筛选值；报告页没有全局筛选栏。禁用编辑 / 刷新，无 MCP / Sites 连接。源信息可能敏感，导出前处理；实际浏览器检查数量、筛选、表格、print 与窄屏。不支持的结构报错，不能静默丢弃。

MCP 仅注册 validate_artifact / render_artifact / render_chart / render_table，均纯计算。来源 export_artifact_package 会写 Sites 工程，不开放；ui:// 资源不注册，不将 JSON 当内嵌图形。
