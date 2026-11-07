# Fakechat 原生测试

Node 20+，无需账户、Bun或专属Channels。serve绑定127.0.0.1，打印带临时fragment token的UI URL和仅本地client环境；UI通过Authorization请求，不把token放进查询串。进程结束即清空全部内存状态。

call请求：{"action":"poll","after":"0"}；{"action":"reply","text":"本地测试回复","reply_to":"1"}；{"action":"edit","id":"2","text":"修订"}；{"action":"upload","file":"绝对路径/report.txt"}，reply可有attachments ID数组。UI用户消息经/messages提交；读取/messages、reply/edit/upload都要求本地token。

会话上限1000条消息、20个附件，总附件32MiB，每个4MiB，每消息至多4个；超限明确报错。Host/Origin检查、重定向拒绝、textContent显示防止消息成为脚本。无外部网络、第二个模型执行器、任意文件HTTP暴露或真实聊天服务投递。完整原server.ts与README保留在resources/source-01/content。
