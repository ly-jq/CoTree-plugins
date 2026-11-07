# 消息与恢复

先确定用户要求是草稿还是发送，核对真实 workspace / channel / user 与线程。解析器只支持标准 workspace.slack.com/archives/<channel>/p<时间戳> permalink，不接受相似外域或矛盾 cid，messageTs / threadTs 保持字符串；其他链接通过工具解析。

发送前准备最终正文与附件，避免意外 @channel / @here 或原样复制不可信 Slack 标记。已有明确授权时直接执行具体动作，目标不清再问。回执记录 channel / ts、正文读回和实际 thread；计划发送记录 scheduled ID 与带时区时间，不能当已送达。

超时后先查同一会话与时间段，确认当前是否已发送，服务支持幂等键时使用稳定键。不知道结果时如实保留未知，不盲目重复。编辑、删除、reaction、分享和创建频道各自遵循任务范围。上传字节与完成文件注册 / 分享分开验收，签名上传地址不接受额外 Slack token。
