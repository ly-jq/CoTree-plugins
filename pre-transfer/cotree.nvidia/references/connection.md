# NVIDIA 环境与服务

Node20+ 的 scripts/gpu-inspect.mjs 只读执行 nvidia-smi 固定查询，inspect <新output.json>；parse <saved.csv> <新output.json> 只解析保存证据。查询失败返回具体缺口和 next，N/A 内存不填零。驱动可见不证明 CUDA、容器、NCCL/NIXL、工作负载或云账户有效。官方字段合同：[nvidia-smi](https://docs.nvidia.com/deploy/nvidia-smi/index.html)。

完整 12 份源 Skill 与全部深层脚本/资源保留于 resources/source-01/content/skills。Python、uv、Docker、Kit、CUDA、Kubernetes/OSMO 等依赖按所选路线核实，不一次安装所有能力。来源 Dynamo 指南按 [当前官方文档](https://docs.nvidia.com/dynamo/) 与实际部署版本对照；本批不修改驱动、集群或容器。

AI-Q 本地 helper 位于 resources/source-01/content/skills/aiq-research/scripts/aiq.py，Python3.10+，只允许 loopback 后端与已有匿名本地模式。单次 health/status/report/cancel 可以由宿主执行；远程认证模式需另适配，不能为兼容脚本关闭已有认证。相邻 deployment 文档列出了镜像/服务前提。恢复使用已有 job ID，不再提交。

NGC_API_KEY / HF_TOKEN / NVIDIA_API_KEY / NVCF_API_KEY 是独立目标工具环境名称，不是本包读取的 CoTree 凭据。按模型许可、资源/组织与最小 scope 授权；Azure/cloud/Kubernetes 身份分别核实。避免把 key 放入 argv 或 kubectl 输出；受控环境注入。本机预检与静态脚本检查不证明这些路线或科学结果通过。
