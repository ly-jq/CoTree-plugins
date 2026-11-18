# 联调、进程与交付

按项目约定运行检查。插件内置执行适配器使用 Node 22.13+ 的 `node --run` 执行当前项目已声明的 dev/dev:web/dev:admin/dev:api/preview/build/typecheck/lint/test/test:api/test:e2e/migrate/seed 脚本。安装依赖与其他技术栈继续用原授权 Shell；不把命令字符串塞进参数规避声明。

Environment start 接收 projectPath、script、requestKey、可选 port；返回原 processId。read/stop 必须使用它，read 支持原 stdoutOffset/stderrOffset 游标。进程归原 Service/ManagedProcessManager，服务空闲一小时或宿主关闭会清理；不把预览称为永久部署。重连先 list/read，不能猜 PID。服务 admission 不是健康检查，必须从日志取得实际地址并访问验证。

Journey start 提交有限检查并返回 taskRef；read/events/cancel 读取或控制原 Task。每次新检查使用新的 requestKey，响应丢失用原请求/引用恢复。检查最长 240 秒，超过时拆分实际测试或使用项目原生长任务；拒绝或取消不得报告通过。

至少验证本次范围内的完整链路：用户端写入→真实 API/数据库→管理端处理→用户端读取。核对授权、非法状态、重复/并发操作与持久结果，按实际规则选取，不强制无关测试。绑定代码/契约/迁移/种子/环境版本，记录命令与真正测试数量；零测试成功退出不能证明业务。

Delivery 输入 assessment 和原 taskRefs；输出带 hostTaskObservations 的交付快照。assessment 是协调者声明，工具不认证其真伪。附启动/构建、配置样例、数据库迁移/演示数据、真实入口、证据、采用的参考与剩余工作。代码变化使相关旧证据过期。生产发布只沿用户目标和原审批流程执行。
