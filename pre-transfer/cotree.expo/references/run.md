# Expo 本地入口

Node 22+。node scripts/expo-run.mjs --workspace 应用目录 --mode start [--execute]，模式为 start / ios / android / web / dev-client / export-web。默认只输出 command / args / cwd，不执行；--execute 用参数数组启动应用已安装的 expo CLI，无 shell 插值或 npx 下载，信号转发给子进程。不要把 JSON 数组拼接成未转义的 Shell 文本。

默认 --network localhost、--port 8081，可明确选 lan / tunnel；开发服务器和项目代码仍需正常信任及权限，不是 OS 沙箱。ios 需要 macOS。export-web 必须 --output 指向不存在且父目录存在的目录，不覆盖旧输出。CLI 可执行 app.config 与项目插件，也可能访问网络；检查器不执行这些代码。

启动按钮来源已替换成以上跨平台入口，没有在 CoTree 内添加尚不存在的 Run button schema。已有工程脚本继续可用，原 Codex .toml 与 Bash 仅归档。技术和版本依据见 connection.md。
