# Cardputer / M5Stack USB 工作流

需要 Python3.10+、UIFlow/MicroPython 设备和明确 USB 端口。node scripts/maker-project.mjs create <新目录> 创建串口 hello 和固定依赖 mpremote1.29.0 / esptool5.5.0；生成器不安装、不打开串口、不写设备。用独立 venv 安装 requirements.txt，再用该 Python 执行 -m mpremote --help、-m esptool --help、-m mpremote connect list。

plan 用法：node scripts/maker-project.mjs plan <input.json> <新plan.json>。input 必须含 operation（list-files/push/run/flash）及 port（COM3、/dev/ttyACM0、/dev/cu.usbmodem...）；push/run 加绝对 sourcePath，push 加 remotePath=/flash/apps/hello.py。flash 加 variant=cardputer 或 cardputer-adv、firmwareLayout=merged-uiflow2、绝对 sourcePath 与独立 expectedSha256。argv 是所选 Python 的参数数组，交给现有执行工具，勿拼接 shell 字符串。

先检查设备 /flash；必要时明确创建 apps 目录。文件可用 -m mpremote connect <port> fs cp :/flash/apps/hello.py <新的本地读回文件> 回读对比。监控用 -m mpremote connect <port> repl；退出只关闭本任务进程/端口。mpremote 的 action 会中断当前程序，部分版本/操作会 soft reset；这是实际设备影响。

官方资料：[mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html)、[esptool ESP32-S3](https://docs.espressif.com/projects/esptool/en/latest/esp32s3/esptool/basic-commands.html)、[M5Stack Cardputer-Adv](https://docs.m5stack.com/en/core/Cardputer-Adv)。针对固定安装版本以实际 help/API 核对。

来源 [build-with-claude](https://github.com/moremas/build-with-claude) 的可执行 onboarding、LCD/Snake/Buddy payload 不在原插件包内；完整参考保持，若需要这些内容须按确定 commit 获取到独立目录，核对实际路径与许可。本批未捆绑未经读取的外部脚本，也未声明 BLE兼容：CoTree 没有 Claude Desktop Hardware Buddy 的专属协议。基础 USB 开发不需要 Claude 登录；WiFi/云 app 按用户实际服务独立认证。没有实体刷写、串口上传、LCD/按键/BLE或用户设备验收。
