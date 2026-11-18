---
name: contract-design
description: 为用户端、后端和管理端建立唯一来源的接口、权限、错误、数据与场景契约，并协调版本变化。
---

沿用工程现有 Schema/OpenAPI 的唯一来源；新工程可用 packages/contracts/openapi.json。规范见 [产品规格](../../references/specification.md)。约定请求响应、可空性、错误、分页、状态转换、身份和数据范围。

客户端、运行时校验和 Mock 从同源生成或保持可检查的一致关系，不让两端各自发明返回值。具体代码生成器沿项目工具链；PluginCoTreeAppStudioContract 提供局部结构/$ref/规则场景关联诊断，不替代完整规范校验。

先固定一条切片的契约和共享基线，发布精确内容版本。变更说明影响哪些规则、消费者、迁移和测试，通知协调者按需续派原成员。共享契约和根锁文件保持单一作者。
