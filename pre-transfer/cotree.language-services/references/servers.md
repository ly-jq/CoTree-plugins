# 语言服务器配置

每个 JSON 是待合并片段，不是会自动运行的安装清单。命令来自本批固定的来源仓库；需要在当前系统核实可执行路径、依赖和版本。新八类仅接受宿主显式 command，不猜系统安装、不执行网络下载。

| language 键 | 语言 | 来源启动命令 |
| --- | --- | --- |
| typescript | TS / JS | typescript-language-server --stdio |
| python | Python | pyright-langserver --stdio |
| java | Java | jdtls  |
| go | Go | gopls serve |
| cpp | C / C++ | clangd --background-index |
| csharp | C# | csharp-ls  |
| kotlin | Kotlin | kotlin-lsp --stdio |
| lua | Lua | lua-language-server  |
| php | PHP | intelephense --stdio |
| ruby | Ruby / ERB | ruby-lsp  |
| rust | Rust | rust-analyzer  |
| swift | Swift | sourcekit-lsp  |

配置位置为 CoTree 现有用户 / workspace config.json 的 lsp 字段。优先单语言片段，不覆盖已有 servers。TS/JS、Python、Java、Go 还可使用宿主已有的受管本地运行库；Java 可采用 jdtlsPath / javaHome，避免把项目 JDK 当启动 JDK。

C / C++ 共用 cpp 配置，协议 languageId 按扩展名区分 c / cpp，.C / .H 保留大小写意义。Ruby 的 .erb 使用 erb；实际语义支持取决于 ruby-lsp 配置与依赖。C# 优先保留 solution 外层根；Rust Cargo workspace、Swift Package.swift、Kotlin Gradle 多模块同样需要完整项目。需要特定编译目录时显式配置 root。

十类查询使用当前 LSP schema；坐标为一基 UTF-16，仅同步保存文件，不应用服务器发来的 workspace edit。取消、空闲关闭、跨工作区与子权限边界由原生客户端负责。模板可解析、进程启动、语义正确三者分别验收。
