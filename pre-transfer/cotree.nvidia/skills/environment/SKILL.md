---
name: cotree.nvidia.environment
description: "核实 NVIDIA 硬件、驱动与所选工作流前提。"
disable-model-invocation: false
---

# nvidia

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

按用户任务选择本包能力，先读 source-index；不按关键词强制安装远程 skill。scripts/gpu-inspect.mjs inspect <新JSON路径> 只执行固定 nvidia-smi 字段查询，返回实际设备、驱动、内存或明确缺口；它不证明 CUDA、容器或互联工作正常。按目标产品核实 OS、驱动、CUDA/runtime、VRAM、license；未知设备不自动升级驱动、启用 sudo 或创建云资源。额外远程技能需要审查来源/版本并由现有插件安装合同处理。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/nvidia-skill-finder/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
