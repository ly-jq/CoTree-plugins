---
name: cotree.cwc-makers.setup
description: "准备 Cardputer / M5Stack 的独立 USB 开发环境。"
disable-model-invocation: true
---

# cwc-makers

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

确认真实板型、操作系统、USB 数据线和用户要做的是检查/开发/刷写；不能沿用来源默认 Cardputer-Adv。用 scripts/maker-project.mjs create <新目录> 创建 Python 依赖和 MicroPython 串口示例；在独立 venv 安装固定 mpremote/esptool，不修改系统 Python。先 mpremote connect list 枚举端口，依据实体标签与用户选择明确目标；不自动连接第一个设备。无需 Claude 账户、Desktop 或 BLE。原 build-with-claude 脚本/应用不在来源包内，按需独立获取并记录 commit，核对实际布局，不默认 git pull。

领域参考（保持原相对目录）：
- resources/source-01/content/commands/maker-setup.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
