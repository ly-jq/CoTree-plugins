# Temporal 技术资料

resources/source-01/content/skills保留四项来源与全部参考，但只注册本包十项Skill。

- temporal-developer/references/core：determinism、patterns、interactive-workflows、versioning、cli-workflow-commands、dev-management、troubleshooting、priority-fairness、standalone-activities。语言目录python/typescript/go/java/dotnet/ruby/rust按源文件实际存在使用；integrations.md集中指向框架集成。
- temporal-ops/references/triage：connectivity/authentication/certificates、workflow-stuck、worker-health、non-determinism、replay、schedule-missed、HA/performance/payload；ops：namespace、IAM、capacity、billing、audit、export、migration、Terraform、SAML/SCIM与self-hostedadmin。
- temporal-cloud-setup：sdk-cloud与failure-handling资料保留，prerelease统一CLI和provision.sh的命令/固定确认格式不继承。
- temporal-serverless：concepts、sdk-configuration、AWS Lambda setup/IAM/versioning/observability/diagnostics/self-hosted与CloudFormation模板。部署前按当前官方支持状态核实，不直接套用旧IAM策略。

来源提到而未随包提供的getting-started / workertuning不伪造路径，由本包local / tune覆盖入口并查询实际版本官方文档。
