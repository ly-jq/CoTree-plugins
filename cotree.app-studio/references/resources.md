# 代码资源与可选分析引擎

先登记 source.kind/locator/usage、版本/平台/工具及原件 hash。缺少原件时保留派生文件身份并注明来源链缺口。不同版本或平台的函数、地址和运行证据不自动合并。

已有源码与 source map 优先；References inventory/source-map 只读取，不执行材料。对 bundle/ASAR、Java/.NET、原生程序选择实际安装可用的分析器，输入为授权材料副本。动态观察需要相应环境；worktree 不是 OS 沙箱。

可选 craft-anything MCP 使用已安装的 `craft-anything-cli mcp`。先通过 CoTree 现有 MCP 目录发现和连接，读取本机实际 tools/list 与版本，再调用所需的研究工具；例如 js_app_map/js_sources_restore、managed_ilspy_decompile、java_vineflower_decompile、native_call_graph_show。不同版本/外部引擎可能缺失，返回具体依赖与下一步，不假装运行。

不要调用其 rebuild 或外部 Agent 循环替代 CoTree Group。MCP 连接与权限由原配置/管理器持有，插件不保存密钥或私建 MCP 进程。没有 MCP 时已有源码、源映射和研究仍可继续。

业务输出为候选规则、协议映射、算法说明、测试向量和直接采用/适配/重写建议。原始代码是否可分析与是否可复制分别记录。规范采用归业务成员；参考软件缺陷可按目标纠正并记录差异。
