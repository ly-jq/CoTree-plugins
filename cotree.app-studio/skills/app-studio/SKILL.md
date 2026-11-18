---
name: app-studio
description: 从一句应用需求持续完成用户端、业务后端、管理端、联调和交付；使用 CoTree Group 研究参考产品、接口录制与可用代码资源。用于完整应用或跨端业务功能开发。
---

把用户一句话作为完整工作目标，保留其范围、技术栈、参考和现有授权。查看工程与 AGENTS；已有工程就地适配，空工程可用 PluginCoTreeAppStudioStart（goal、projectPath、scaffold）。不把初始化回执或设计报告当成应用完成。

## 组织 Group

你承担当前 Group 的协调责任。若仍为独立 Session，先发现 SessionControl，按宿主现行策略 evolve self；已在 Group 中继续原组。不可用时说明具体缺口，不伪称已创建。用当前模型/权限继承，不在技能中指定供应商。

从包内 [Group 交接](../../references/group.md) 读取当前调用形式。按输入需要选择 business、resource-analyst、backend、web、admin、integrator 模板；名称前缀为 cotree.app-studio。代码资源分析按需启动，测试设计可与研究并行。研究目标与材料引用写入分工，不把全量聊天或代码复制给每个成员。

持续循环：选择一条有价值的跨端业务流程 → 固定规则/契约基线 → 并行实现 → 集成实际产物 → 运行真实流程 → 续派原成员修复 → 扩展下一流程。成员数量、依赖、范围和继续决定由你解释，不要求用户填写 DAG，也不为职位安排无用的等待。

## 研究与实现

- 有网站/演示：加载 api-capture 和 reference-research，先观察现有页面与录制；需要登录或用户示范时保留原任务等待，不编造账号。
- 有源码、bundle、source map 或逆向结果：加载 code-resource-analysis，输出来源、调用关系、候选规则和测试向量。由 business 统一采用到规则/契约。
- 规则与接口遵循 [产品规格](../../references/specification.md)。既有代码 Schema/OpenAPI 继续作为唯一源；没有规范时再选择。
- 三端消费同一版本；前端 Mock 标记明确，最终业务联调连接真实后端和数据库。采用已有成熟模块时保留来源和必要许可说明。
- 根配置、共享契约、锁文件与迁移均明确一个作者；独立成员用 worktree，最终由有授权的 integrator 串行集成精确产物。

## 推进到交付

使用 [联调与交付](../../references/verification.md)。PluginCoTreeAppStudioEnvironment 管理原宿主进程，Journey 提交/读取实际检查，Delivery 汇总原回执。工具不是必经门禁；适配现有工程命令时可直接用原授权工具。

报告到达即据其内容继续工作；已结束成员用原 ref 的 continue，运行中成员用 message。保留用户新指示与取消。普通规则变化无需每步请求确认；只有实质缺失信息或当前权限阻断才向用户询问。

完成时交付可启动源码、三端入口、配置/迁移/演示数据、实际检查证据与剩余范围。发布仅在原目标包含发布且权限允许时执行。主模型依据目标与证据判断完成，不用固定修复轮数、自评分或清单替代结果。
