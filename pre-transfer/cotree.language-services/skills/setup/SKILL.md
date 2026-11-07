---
name: cotree.language-services.setup
description: "配置或排查 CoTree 本地语言服务的服务器、工程根和工具链。"
disable-model-invocation: false
---

# 语言服务

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
读取 references/servers.md。先调用 LSP status 检查配置而不启动进程；核对当前宿主支持的 language enum、项目语言及实际服务器版本。为目标语言读取 configuration 下的单项片段，把已核实的 command / args / root 合并到现有宿主 lsp.servers，保留其他设置。Windows 的 npm / Ruby wrapper 可需要显式解释器和脚本路径，不假定无后缀命令可执行。
安装依赖仅在当前任务授权范围内进行，来源、版本和平台明确；加载技能和普通查询不自动下载。Java 启动 JDK 与项目 JDK 分开，Go 多模块保留 go.work；C/C++ 准备准确 compile_commands.json；其他工程根按服务器要求核对。环境变量只通过宿主配置传入。
用保存的最小真实项目执行一次 definition / hover 并核对目标；status configured 不代表已启动。报告服务器身份、目标文件、实际结果及不支持的动作。
