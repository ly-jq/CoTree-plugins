# Temporal 环境与身份

本地devserver无需Cloud账户。Node 22+执行随包plan / bootstrap；plan不执行进程、不安装CLI，默认127.0.0.1:17233 / headless / 内存，显式关闭CLI环境与配置加载，仍建议隔离HOME / USERPROFILE。只提供新的数据库路径，不覆盖现有store。固定验证CLI为1.9.1，Python样例SDK1.34.0 / Python3.10+；在项目虚拟环境装requirements。服务启动成功、Workerpolling、Workflow完成与历史分别验收。

Cloud使用独立API key或mTLS，数据面TEMPORAL_ADDRESS / TEMPORAL_NAMESPACE / TEMPORAL_API_KEY / TEMPORAL_TLS或当前SDK对应字段；API key必用TLS。mTLS私钥留在任务外的私密存储，使用路径 / 受控配置传入。Cloud管理入口的身份、RBAC与namespace权限独立核实，不能把data-plane key当任意管理API身份。本包不自动签发、读取、打印或刷新key。

来源cloud-setup/provision.sh针对当时prerelease与POSIX环境，保留作历史参考，不注册为CoTree自动开通器。当前稳定CLI没有cloud子命令时使用官方支持的tcld / 控制台 / Cloud API，按真实help确认；不安装原宿主配置。服务端生产基础设施、证书、SAML/SCIM、Lambda/WCI和账单按实际账户验收。

2026-10-07核对：[CLI server](https://docs.temporal.io/cli/command-reference/server)、[Python测试](https://docs.temporal.io/develop/python/best-practices/testing-suite)、[Cloud API keys](https://docs.temporal.io/cloud/api-keys)。
