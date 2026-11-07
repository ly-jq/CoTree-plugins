# Game Studio

在 CoTree 中规划、实现和试玩浏览器游戏，覆盖 Phaser、Three.js、React Three Fiber、精灵素材和游戏 UI。

- 插件：cotree.game-studio，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 19 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.game-studio.plan
- Skill：cotree.game-studio.architecture
- Skill：cotree.game-studio.phaser
- Skill：cotree.game-studio.three
- Skill：cotree.game-studio.react-three
- Skill：cotree.game-studio.sprites
- Skill：cotree.game-studio.assets-3d
- Skill：cotree.game-studio.ui
- Skill：cotree.game-studio.playtest



## 改造内容

- 九项来源能力逐项重写为九个 CoTree 原生工作流，统一语义选择和权限边界。
- 新增固定 Phaser 3.90.0 的独占目录示例，模拟规则、渲染与 DOM 控件分离，可用键盘和按钮完成游戏。
- 保留三个精灵脚本原算法与完整 3D / UI 参考，运行副本补充尺寸约束、帧数约束与禁止覆盖；完整原图标随包展示。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本地示例是 Phaser 3 路径，不代表最新 Phaser 或所有游戏；Three.js、R3F、物理、GLB 和真实用户素材需按目标工程分别验收。
- 精灵处理需 Python 3.10+ / Pillow；AI 生成依赖 CoTree 实际提供的图像能力，当前包不含账户、图像生成服务或发布后端。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
