# 项目指令合同

以当前宿主 InstructionList / InstructionExplain 返回的 schema 和编译结果为准。本包不加载规则、不产生第二份持久化权威。

## 文件与范围

根入口兼容 AGENTS.md / COTREE.md；另可读取 .cotree/instructions/AGENTS.md / COTREE.md、.cotree/Role.md 和 .cotree/rules 下 Markdown。沿被引用路径的祖先目录发现嵌套 AGENTS.md，不能认为扫描发现的所有子目录规则都已应用。手写规则支持 id、enabled、mode、priority、paths、exclude、runIds；同 id 冲突会给出诊断。默认优先级依来源而异，按 priority、depth、path 排序，以 Explain 为准，不靠文件读取顺序猜优先级。

## 引用

独立行 @include path.md / @path.md 为普通引用；@require path.md 要求完整加载。路径相对引用文件所在目录，必须留在允许的项目根，不能跨越符号链接到外部、读取生成会话目录或其他被排除路径。代码块与 HTML 注释中的指令示例不执行。循环、过深、缺文件和超限会产生诊断；必读失败不能静默忽略。当前默认深度上限为 3，单文件 80,000 字节，总计 160,000 字节，可由宿主配置改变。

## 编辑与持久化

维护手写文件用 Read / Edit / Write，并用目标 paths 的 InstructionExplain 核验。团队文档保存稳定事实与操作指引；不要写本机绝对路径、密钥、临时任务状态或未经核实的工具。生成 / 托管语义策略通过 InstructionPin / InstructionUpdate / InstructionRemove 修改，引用真实用户消息、保留版本与 hash，沿用宿主审批和语义校验。

当前语义策略只接受其实际 schema 与服务支持的选项；非默认 priority、advisory、非空 paths / exclude 等旧 Markdown 选项不应假设可在语义策略生效。若用户确实要维护手写的路径规则，用 maintain；不要把它当服务拒绝后的降级办法。InstructionExplain 说明编译结果，不证明某个已经开始的模型请求拿到了新内容。
