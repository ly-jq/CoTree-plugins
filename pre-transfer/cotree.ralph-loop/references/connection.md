# 原生持续执行

三个入口continue/status/cancel复用CoTree Session。TaskIntentUpdate维护可选执行记录和计划，不控制完成、不启动循环、不证明任务成功。完整目标、已授权范围、实际证据和剩余工作由主模型维持。取消通过宿主停止按钮/实际任务工具执行。

来源Stop Hook和Bash setup保留于resources，只作迁移参考，不注册；不承诺会话结束后无人值守继续。需要未来定时任务必须由用户明确授权并使用宿主现有调度能力。
