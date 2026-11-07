# Apple 独立接入

固定 xcodebuildmcp 2.7.0，stdio: npx -y xcodebuildmcp@2.7.0 mcp。此版要求 macOS 14.5+、Xcode 16.x+；Node 使用本插件验证的 Node 24，目标平台需另验。关闭 Sentry 与自动 Xcode 同步，启用 simulator/macOS/SwiftPM/项目发现/UI/debug 工作流；日志按实际 launch 工具参数采集。服务名以实际 tools/list 为准；工具目录可在 Windows 初始化，不表示 xcrun 或 Simulator 可用。

上游已将当前产品更名 MobileBuildMCP；本包仍固定经过检查的 XcodeBuildMCP 2.7.0，不跟随 latest 自动换名升级。参考 [固定版源码](https://github.com/getsentry/MobileBuildMCP/tree/v2.7.0)、[当前官方产品](https://www.mobilebuildmcp.com/)、[Apple Xcode 支持](https://developer.apple.com/support/xcode/)。

先通过宿主 Shell 在 Mac 运行 xcodebuild -version、xcode-select -p、xcrun simctl list devices available --json。将真实 JSON 保存后运行 node scripts/apple-targets.mjs select <simctl.json> <UDID>。构建计划输入：projectPath（绝对 .xcworkspace/.xcodeproj 目录）、scheme、simulatorUDID、derivedDataPath（绝对目录）；node scripts/apple-targets.mjs plan <input.json> <新output.json>。生成器不执行命令、不替代当前工具审批、不认证所填 scheme。

Simulator 本地构建不强制 Apple Developer 账户；实体设备签名、Developer ID、公证和商店分发需独立 team/certificate/profile/Keychain 凭据。不创建虚构 token 绑定；认证 HTML 单列后续。本批未实跑 Xcode 编译、真机、SwiftUI preview/serve-sim/热重载、签名与公证。
