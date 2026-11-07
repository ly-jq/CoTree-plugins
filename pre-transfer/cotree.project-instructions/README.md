# 项目指令

检查和维护 CoTree 项目指令，把用户明确的长期要求交给原生指令服务。

- 插件：cotree.project-instructions，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 3 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.project-instructions.audit
- Skill：cotree.project-instructions.maintain（显式调用）
- Skill：cotree.project-instructions.remember（显式调用）
- Skill：cotree.project-instructions.recommend



## 改造内容

- 合并项目指令维护与开发配置推荐，重写为 audit / maintain / remember / recommend 四个技能。
- 使用原生 Instruction 工具解释范围、优先级、引用和诊断；文件修改使用 Read / Edit / Write，语义规则持久化仍由宿主管理。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 依赖当前 CoTree 的 Instruction 工具与文件工具；工具不可用时只返回已核对内容和未执行差异。
- 托管规则的增改删需要宿主语义服务、用户来源事件及现有权限许可；不可用时不得降级为手写规则绕过。
- 原生工具与临时文件工作流可以验证；真实模型的建议质量和跨平台 Desktop 行为仍需任务验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
