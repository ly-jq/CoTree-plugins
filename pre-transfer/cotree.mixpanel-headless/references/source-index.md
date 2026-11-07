# Mixpanel Headless 来源与运行

完整来源在 resources/source-01/content/skills：mixpanelyst/SKILL.md（五引擎、参数与统计）、mixpanel-auth/SKILL.md（账户 / 项目 / workspace / target）、dashboard-expert/SKILL.md 和 references（完整 API、九类模板、bookmark pipeline、chart types）、setup/SKILL.md。脚本只作参考，不加载源宿主指令。图标和三张预览保留。

本次以官方 PyPI mixpanel-headless 0.4.0 验证；Python 3.10+，建议独立 venv。scripts/mixpanel-local.py 仅 diagnose、describe 和 validate；不建立 Workspace、不进行登录或网络查询。validate 只接受列出的七种类型，拒绝多余字段；不能证明服务端约束或业务成功。使用当前 API 代替来源过时参数，不执行 setup.sh 的全局安装。

官方入口：https://github.com/mixpanel/mixpanel-headless 与 https://mixpanel.github.io/mixpanel-headless/ 。独立登录与真实账户在根目录 auth-followup.html 跟进。
