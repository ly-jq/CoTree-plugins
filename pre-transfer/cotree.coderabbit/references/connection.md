# CodeRabbit 接入

核对日期：2026-10-14；官方文档基线 CLI 0.9.0。先检查实际安装的 --version / --help，不假设来源仓库的旧参数仍适用。

使用官方签名安装包。Windows 原生 x64 支持；安装前验证 Authenticode 与发布者，安装和 PATH 变更是独立操作。凭据留在官方 CLI 的独立存储；本包不新增 API key 环境变量，不读取或复制凭据。登录地区、组织、仓库及付费能力分别验收。

推荐用户在终端完成 auth login（EU 使用 --region eu），随后在相同上下文运行 auth status --agent；结构化 authenticated:true 才能证明该次身份检查成功。不会在后台自动开启登录或扩大执行权限。

接入验收：可信 CLI → 独立 OAuth → 指定测试仓库的最小只读审查 → 完整终态与实际发现核对 → 按授权修复并测试 → 过期 / 撤销。review 会上传差异；本机解析只读取指定 NDJSON 文件，不访问账户。

官方：[CLI](https://docs.coderabbit.ai/cli/) · [参数](https://docs.coderabbit.ai/cli/reference) · [Windows](https://docs.coderabbit.ai/cli/windows) · [输出合同](https://docs.coderabbit.ai/cli/agent-mode)。
