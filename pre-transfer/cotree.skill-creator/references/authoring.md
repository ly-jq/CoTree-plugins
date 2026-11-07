# CoTree Skill 作者合同

工作区独立技能由 SkillManage 管理 .cotree/skills 下的 SKILL.md 与 skill.json；create / update 需要 description、非空 retrievalHints 和正文 content。retrievalHints 是检索提示，不是正则任务路由。view 返回版本，update 的 expectedVersion 防止覆盖并行修订。后台学习产生 candidate，不直接覆盖已存在技能。SkillInstall 负责来源取得、审计、更新与归档，安装后仍需 Skill 加载。

插件 Skill 的根清单 skills[] 注册 name、description、path；Skill 回执给出 skillDir / pluginRootDir。独立技能可声明 metadata.requiredTools / requiredSkills 和受控 executionContract；只有实际宿主支持的元数据才采用。requiredTools 只准备依赖，不授予权限；allowedTools / allowed-tools 已移除。与目标无关的命令、固定模型、原宿主根变量、自动执行 Hook 不进入正文。

描述要易于发现且边界明确；细节逐步展开，参考必须有可达路径。输出脚本使用跨平台运行时，声明依赖与输入输出，运行时资料不要混入模板。资源文件与例子只有确有用途时才保留，不为了结构建立空目录。模板中的示例名称和任务须按用户目标替换。

验证分开记录：格式 / 路径、安装 / 加载、脚本运行、实际任务。对照评估保存 scenario、variant、status、check 证据和可用的实际 tokens / elapsedMs。未运行不能通过，缺数据不是零用量。统计使用已测样本，方差为总体方差，n=1 为 0 且不能推断稳定性。
