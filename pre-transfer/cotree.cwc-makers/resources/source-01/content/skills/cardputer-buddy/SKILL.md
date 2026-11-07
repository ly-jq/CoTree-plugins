---
name: "import.claude.cwc-makers.cardputer-buddy"
description: "Iterate on the Cardputer-Adv MicroPython app bundle (Claude Buddy, Snake, Hello) after the device is already provisioned via m5-onboard. Use when the user wants to add a new app, push a single changed .py without re-flashing, watch device serial logs, or run a one-shot REPL command. Trigger on \"add an app\", \"push to the cardputer\", \"tail the device\", \"run on the device\", or follow-up work after /maker-setup."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Cardputer Buddy app bundle

The `buddy/` directory in the local `build-with-claude` clone is the MicroPython payload that `m5-onboard` installs onto `/flash/`. Work inside that clone.

## Device layout

```
/flash/
├── main.py              launcher menu (replaces UIFlow's boot flow)
├── buddy_*.py           shared libs (BLE, UI, state, protocol, chars)
├── burst_frames.py      sprite frames
└── apps/
    ├── claude_buddy.py  BLE client → Claude Desktop's Hardware Buddy
    ├── hello_cardputer.py
    └── snake.py
```

`main.py` scans `/flash/apps/` at boot and lists every `.py` as a menu entry. Drop a file into `buddy/device/apps/`, push it, and it appears on next boot.

## Adding an app

Crib from `buddy/device/apps/hello_cardputer.py` — smallest example of keyboard polling, font, and exit conventions. Then push without re-flashing:

```bash
python3 onboard/scripts/install_apps.py --port <PORT> --src buddy
```

`<PORT>` is whatever `detect.py` reported last run (e.g. `/dev/cu.usbmodem1101`, `/dev/ttyACM0`, `COM3`).

## Dev loop tooling (`buddy/scripts/`)

```bash
# Push a subset of files over USB-serial
python3 buddy/scripts/push.py --port <PORT> --files apps/snake.py

# Watch device logs
python3 buddy/scripts/tail_serial.py --port <PORT>

# One-shot REPL exec
python3 buddy/scripts/repl_run.py --port <PORT> --script "import os; print(os.listdir('/flash'))"
```
