# 原生示例

无需账户。Node 20+运行scripts/echo.mjs，以一个独立argv传入文本。只回显JSON，无文件写入、进程启动或网络请求。重复的legacy command与skill格式合并成一个echo入口；演示MCP占位地址未注册。

本包展示已完成插件，不重复提供通用插件/Skill生成器；作者功能由既有plugin-development与skill-creator提供。

## 与 SDK 0.13.0 的关系

本包只注册 Skill，保持宿主仍支持的 Manifest v3。echo 脚本由已授权的宿主工具运行，没有注册成代码 Tool；它不自动得到文件、网络、Task 或进程能力。升级 SDK 不要求把所有 Skill 包改成 v4。

需要真正的 SDK 扩展时，用 cotree.plugin-development 的脚手架或公开包的 cotree-plugin-init。代码模板采用 Manifest v4、sdk.apiVersion: 1，并声明实际 requiredCapabilities 与 permissions。当前可选 tool、service、view、task、file-workbench、batch-workbench、workflow-workbench；脚手架不安装插件、不代替业务验证。

代码使用公开 SDK，Task、外部程序、配置、交互、Session/Workflow、模型、账号与 ComputerDriver 继续由原宿主管理。读取 capabilities.describe() 后核对授权与平台依赖；View 和 Provider 回调不能获得隐含 Run 权限。包升级需新 SemVer、摘要与原安装/信任流程，不直接改安装快照。0.13.0 是本轮构建基线，使用未发布的构建时安装同一公开 SDK tarball。
