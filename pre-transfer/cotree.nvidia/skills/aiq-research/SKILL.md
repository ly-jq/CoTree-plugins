---
name: cotree.nvidia.aiq-research
description: "向已部署 AI-Q 提交研究并恢复已有作业。"
disable-model-invocation: true
---

# nvidia

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

先确认用户所选 backend、版本与数据范围。归档 scripts/aiq.py 只支持 loopback 且 REQUIRE_AUTH=false 的既有 AI-Q 合同；可用 Python 单次 health/agents/chat/status/report/cancel，确认其帮助及服务协议，不把它当远程带认证客户端或更改服务为匿名。保留返回 job ID；恢复先 status/report，不重提 chat/submit；长轮询用宿主可取消进程并有界观察。服务的 completed 与报告质量、引用可访问性分别核验；不要把研究报告当真实事实认证。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/aiq-research/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
