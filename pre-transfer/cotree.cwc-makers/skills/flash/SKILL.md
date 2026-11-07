---
name: cotree.cwc-makers.flash
description: "准备和执行指定 M5Stack 固件刷写与恢复。"
disable-model-invocation: true
---

# cwc-makers

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

先保存设备文件、板型、现有固件和明确可恢复方案，再核对官方 M5Burner/UIFlow 镜像、版型、分区和摘要。scripts/maker-project.mjs plan 支持显式 Cardputer/cardputer-adv + merged-uiflow2 的 0x0 整包 argv；其他板型/分区用厂商真实说明，不推断。生成计划不刷写；实际刷写按当前用户授权。遇到物理 download-mode 步骤及时告诉用户 G0/RST 操作并等待真实状态，不能用延时当确认。完成后重枚举同一设备、核对固件、串口/屏幕/输入功能；esptool 退出零不是应用验收。不要自动写入活动 WiFi 凭据或修改 NVS/boot。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/m5-onboard/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
