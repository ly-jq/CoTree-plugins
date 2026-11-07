---
name: cotree.magicpath.images
description: "检查 MagicPath 画布图片并按授权上传项目素材。"
disable-model-invocation: true
---

# MagicPath

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

先 image list projectId 核对真实素材；本地图片确认路径、格式和使用权限。按用户任务用 image add projectId 文件 上传，读取返回 asset / project 标识并在目标画布确认，不用上传退出码证明显示正确。仓库转画布将所需文件放在工作目录 assets；优先返回的 assetPath，避免过期 accessUrl、仓库 blob URL 或把 base64 塞进源码。图像生成等服务能力以当前 help / 账户为准，不把本包当匿名图像后端。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
