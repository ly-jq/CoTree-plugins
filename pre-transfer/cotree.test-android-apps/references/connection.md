# Android 运行条件

复用现有cotree.android-device服务的status/observe/action，不复制设备服务或修改其插件。用ToolSearch发现实际canonical名称和schema；原观察回执优先于重新自行解析坐标。该服务缺失时可按授权使用已安装ADB和随包辅助工具，能力与证据来源明确说明。

Node22+采集：android-capture.mjs --operation screenshot|ui|gfxinfo|meminfo|logcat --serial 实际序列号 --output 新文件 [--package 包名] [--pid 实际PID] [--adb 绝对可执行路径]。默认只计划，--execute才执行，参数数组/shell=false，固定127.0.0.1:5037，30秒/16MiB上限，输出不覆盖，PNG用二进制写入而非PowerShell文本重定向。UI dump可能有设备不支持 / 空内容；失败不能视为成功观察。

Python3.10+：android-ui.py --input UI.xml --field resource-id --value 精确ID。使用UTF-8读取有大小上限的XML，拒绝DTD/entity、模糊/重复/禁用/密码节点和无效bounds。hash只标记输入，不保证与当前设备一致。

不需要云登录；ADB设备授权、签名、测试后端与私有依赖按实际任务处理。本批不授权操作用户设备、安装APK、清空日志或采集个人画面。CPU/heap需要目标build、Simpleperf/Perfetto/NDK/分析器，平台支持分别核实。

核对依据（2026-10-07）：[ADB](https://developer.android.com/tools/adb)、[Simpleperf](https://developer.android.com/ndk/guides/simpleperf)、[Perfetto](https://perfetto.dev/docs/)。
