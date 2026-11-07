---
name: cotree.nvidia.dynamo
description: "配置 Dynamo 路由并核验 NIXL / UCX / NCCL 互联。"
disable-model-invocation: true
---

# nvidia

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

确认已部署版本、namespace/worker/model 和目标路由，先只读核对 current context、GPU 拓扑和服务；按 source references 选择 round-robin/KV/least-loaded 等受该版本支持的模式。变更仅作用明确 frontend，保留差异与回退。归档 check_interconnect.py 提供 env/node/nixl 子命令，先看帮助与实际命令；kubectl exec 会在远端执行探针，需对应授权。/v1/models 可达不证明 KV 传输正确；观察 KV events、RDMA/NVLink、请求路由与实际传输结果。没有集群时只交付准备及缺口。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/dynamo-router-starter/SKILL.md
- resources/source-01/content/skills/dynamo-interconnect-check/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
