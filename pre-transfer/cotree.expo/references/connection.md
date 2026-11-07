# 本地开发与可选云账户

本地 Expo CLI 开发无需 EAS 登录；EAS Build / Submit / Update / Hosting 另用用户独立 EAS 登录或受控 EXPO_TOKEN。不能继承 Codex 身份。应用商店、推送、地图和后端分别管理权限；EAS 本地构建也有其登录和工具链要求，不与纯 Expo 本地编译混淆。token 不进入命令参数或 EXPO_PUBLIC_*。

Windows 可做 Web 和配置齐全的 Android 开发；本地 iOS 需要 macOS / Xcode，EAS --local 官方不支持 Windows。原生客户端、云构建、商店和 OTA 必须分别验收，当前本机迁移验证不触发云任务。

2026-10-07 核实：[Expo CLI](https://docs.expo.dev/more/expo-cli/)、[Expo FAQ](https://docs.expo.dev/faq/)、[开发构建](https://docs.expo.dev/develop/development-builds/introduction/)、[EAS 本地构建](https://docs.expo.dev/build-reference/local-builds/)、[Workflows](https://docs.expo.dev/eas/workflows/introduction/)。
