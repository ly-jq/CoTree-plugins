---
name: cotree.magicpath.canvas
description: "把仓库界面或组件创建、修改到 MagicPath 画布。"
disable-model-invocation: true
---

# MagicPath

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

先读取来源工程的入口、主题、字体、资产和行为；相关一屏使用一个组件，独立屏幕各用工作目录。明确目标 project / component 与尺寸。官方 code start --project ID --dir 新目录 或 --component ID --dir 新目录 是远端写入，会建立 / 复用 pending revision；code context 仅拉取参考，不能直接 submit。按当前返回的 magicpath-code.json 绑定目标，只改 src/App.tsx、src/index.css、src/components/generated/**、临时 assets/**，保留 package / Vite / lock 文件。React + Tailwind v4 以实际 scaffold 为准，状态可交互，不加无要求的设备外框。code submit --dir 目录 --wait 会发布编辑及推导删除；先检查真实 diff，再按已有授权提交。用 code status 读到 completed，失败修复同一 revision，取消 / 超时先查状态，不盲目新建重试；在真实画布查看输出。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
