# CWC Makers 来源覆盖

仅根 Manifest 注册的原生入口加载。来源 Skill / commands / 配置作为参考归档，不启动原宿主。

| CoTree 入口 | 完整来源 |
|---|---|
| setup | [source-01/content/commands/maker-setup.md](../resources/source-01/content/commands/maker-setup.md) |
| flash | [source-01/content/skills/m5-onboard/SKILL.md](../resources/source-01/content/skills/m5-onboard/SKILL.md) |
| apps | [source-01/content/skills/cardputer-buddy/SKILL.md](../resources/source-01/content/skills/cardputer-buddy/SKILL.md) |
| debug | [source-01/content/skills/m5-onboard/SKILL.md](../resources/source-01/content/skills/m5-onboard/SKILL.md) |

setup/onboard/app 原能力保留为 4 个入口；onboard 的刷写和诊断拆开，不重复注册。CoTree USB 路径替代原宿主调用；专属 BLE 协议尚无 CoTree 实现。
