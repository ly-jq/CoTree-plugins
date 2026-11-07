# Microsoft Graph 独立接入

使用自己注册的 Microsoft Entra 应用和合法 OAuth 委托身份，token 的 audience 必须为 Microsoft Graph；客户端类型、回调和授权流程按实际独立客户端配置，不复制原宿主 client_id、secret 或会话。此包不实现自动登录、token 交换或刷新，也不将静态 header 绑定当作完整 OAuth。

脚本固定使用 https://graph.microsoft.com/v1.0/me，面向当前已登录用户。profile 需 User.Read；日历 / 邮件所需权限见下方。此实现不支持 app-only client credentials、/users 下任意邮箱、共享邮箱写入、国别云或自建 Exchange。个人 Microsoft 账户与工作 / 学校账户的功能不同，租户策略 / 管理员同意也可能限制访问。

先 profile 核实账户，再对明确目标做最小只读和分页，随后按用户授权创建测试对象、修改并读回。401、403、429 与 412 分别核查 token、权限 / 策略、限流和版本；不能把一个原因用于所有错误。匿名 401 或合成协议夹具不证明账户可用。凭据只由环境注入，不放进 request JSON、包、参数、日志或认证清单。

所有请求携带 Prefer: IdType="ImmutableId"；它有助于同一邮箱内移动后的定位，归档邮箱 / 导出再导入仍可能改变 ID。发送成功后可能稍后才出现 Sent Items 副本，不能因即时读取失败重发。ID 保留大小写，邮件和日历的 ID 不能互换。

核对日期 2026-10-06：[委托身份](https://learn.microsoft.com/en-us/graph/auth-v2-user)、[稳定 ID](https://learn.microsoft.com/en-us/graph/outlook-immutable-id)。

本包 token：COTREE_OUTLOOK_CALENDAR_ACCESS_TOKEN。基本日程可用 Calendars.ReadBasic，需正文等完整读取时用 Calendars.Read，创建 / 改期 / 取消 / 回复需 Calendars.ReadWrite；profile 另需 User.Read。getSchedule 的个人委托账户不支持。按需要配置最小权限，不为只读任务默认请求写权限。实际日历共享与邮箱功能需额外核实；本包没有借用任何来源 Microsoft Outlook app 身份。

[REST 操作](api.md)、[calendarView](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0)、[忙闲与账户限制](https://learn.microsoft.com/en-us/graph/api/calendar-getschedule?view=graph-rest-1.0)。
