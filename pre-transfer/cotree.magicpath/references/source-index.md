# MagicPath 来源与运行

来源完整保留在 resources/source-01/content/skills/magicpath：SKILL.md、references/cli-reference.md、working-with-repositories.md、working-with-embedded-browsers.md。技术内容可参考；原宿主浏览器 / setup-skills 指令不执行。

固定 npm magicpath-ai 2.6.1；官方 https://github.com/MagicPathAI/agent-skills 和 https://www.npmjs.com/package/magicpath-ai 。在用户工具目录安装，helper 通过本地包 bin 解析，拒绝其他版本。--tooling 是 CLI 安装目录，--workspace 是实际项目 cwd，两者分开。默认打印 argv；--execute 才执行固定只读命令，不自动登录或开浏览器，错误不打印可能含秘密的远端正文。写入流程使用官方 CLI 的明确动作，遵循任务授权。

helper 固定官方 HTTPS API / Web 地址；独立身份 MAGICPATH_TOKEN，可选 MAGICPATH_TEAM_ID。不注册假 MCP，不存储凭据。share 仅生成 URL，不证明共享或对象存在；code start、submit、image add、add 均有写入作用，不能称为只读。
