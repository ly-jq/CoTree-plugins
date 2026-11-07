---
name: cotree.nvidia.simready
description: "分阶段把 CAD / 源资产转为可验证的 SimReady USD。"
disable-model-invocation: true
---

# nvidia

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

确认源格式、单位/坐标轴、比例、实例、材质、物理属性和最终用途。使用完整嵌套 references/shared 中的转换、Content Agents、conformance、validation 与 package 脚本，先核实每阶段依赖和输入输出；不存在单一万能 runner。preflight 中的 clone/install/deploy 是独立操作，不能默认执行。先保留原资产，在新目录输出；物理/碰撞和视觉符合性独立验收，不以工具返回零判定 simulation-ready。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/omniverse-cad-to-simready/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
