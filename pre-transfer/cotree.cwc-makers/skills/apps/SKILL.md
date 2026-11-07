---
name: cotree.cwc-makers.apps
description: "通过 USB 向 M5Stack 迭代 MicroPython 应用。"
disable-model-invocation: false
---

# cwc-makers

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

已刷 UIFlow 的目标先确认 /flash 和 apps 布局，读取与该固件匹配的 M5 屏幕、键盘、按键 API。通过生成器输出的 hello 示例验证串口，再实现具体 app；示例只打印，不声称带 LCD 或 BLE。plan push 限单个 /flash/apps/*.py，使用实际 mpremote connect <port> fs cp，已有文件先读回/备份；按需要创建 apps 目录。plan run 在 RAM 执行所选脚本，会打断运行程序，按任务授权使用。变更后读回字节/摘要并观察设备行为；原 Claude Buddy BLE 客户端不能连接 CoTree，不能声称已移植该私有协议。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/cardputer-buddy/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
