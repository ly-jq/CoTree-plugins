# CoTree LSP 离线资源包

准备日期：2026-10-05。用于已有内网模型、语言环境的 Windows x64 / 麒麟 V10 机器。优先使用下方已经组装好的完整包。插件面板的“导入插件”入口不用于安装这些资源。

## 完整包：解压后直接复制

| 目标机器 | 只需携带这一个包 |
|---|---|
| Windows x64 | [cotree-lsp-windows-x64.zip](packages/cotree-lsp-windows-x64.zip) |
| 麒麟 V10，`uname -m` 为 `x86_64` | [cotree-lsp-kylin-v10-x64.tar.gz](packages/cotree-lsp-kylin-v10-x64.tar.gz) |
| 麒麟 V10，`uname -m` 为 `aarch64` | [cotree-lsp-kylin-v10-arm64.tar.gz](packages/cotree-lsp-kylin-v10-arm64.tar.gz) |

每个包都包含完整的 `lsp/` 文件夹：四种语言服务、该平台的 gopls、JDT LS 和已解压到位的 JDK 21。无需再从 `common/` 等目录取文件，也无需运行安装脚本。

1. 把对应压缩包复制到目标机器并解压。**麒麟包请在麒麟上解压**，以保留执行权限和符号链接。
2. 退出 CoTree，将解压得到的整个 `lsp` 文件夹复制到以下目录（没有 `runtimes` 时创建它）：Windows 为 `%USERPROFILE%\.cotree\runtimes\`；麒麟为 `~/.cotree/runtimes/`。若自定义 `COTREE_HOME`，使用该目录下的 `runtimes/`。
3. 最终应存在 `runtimes/lsp/node`、`runtimes/lsp/bin`、`runtimes/lsp/jdtls`、`runtimes/lsp/jdk`，然后重新启动 CoTree。

已有旧 `lsp` 文件夹时先将其改名备份，再复制整份新目录。若以前显式配置过 LSP 的 `command`、`javaHome` 或 `jdtlsPath`，旧路径会覆盖自动发现，需要移除旧覆盖或指向新目录。模型和项目环境继续使用原有配置。

完整包的校验值在 [packages/SHA256SUMS.txt](packages/SHA256SUMS.txt)，打包和校验记录在 [packages/manifest.json](packages/manifest.json)。下文保留原始资源说明，供需要自行组合组件时使用。

## 文件清单

| 目录/文件 | 内容 | 用途 |
|---|---|---|
| `common/node-language-servers.tar.gz` | TypeScript 5.9.3、TypeScript Language Server 5.0.0、Pyright 1.1.414 的完整 npm 内容 | Windows / Linux 两种架构共用，解压后得到 `node/` |
| `common/jdt-language-server-1.56.0-202601291528.tar.gz` | Eclipse JDT LS 1.56.0 完整发行包，包括 Windows、Linux x64、Linux ARM64 配置 | Java 语言服务 |
| `windows-x64/gopls.exe` | gopls 0.21.1，Windows x64 | Go 语言服务 |
| `linux-x64/gopls` | gopls 0.21.1，Linux x86_64，关闭 CGO | 麒麟 V10 x86_64 |
| `linux-arm64/gopls` | gopls 0.21.1，Linux ARM64，关闭 CGO | 麒麟 V10 aarch64 |
| 各平台的 `OpenJDK21U-jdk_*` 压缩包 | Temurin JDK 21.0.12.1+1 | **可选**，用于启动 JDT LS；已有可用 JDK 21+ 可复用 |
| `manifest.json`、`SHA256SUMS.txt`、`verify.mjs` | 精确版本、来源、大小、SHA-256 及离线校验器 | 检查拷贝完整性 |
| `sources/` | npm 原始包、上游元数据、校验值、gopls 源码包、构建信息与许可证 | 留存来源及许可 |

JavaScript/TypeScript 与 Python 服务需要 Node.js 20+，CoTree Desktop 使用自身内置 Node 启动它们。独立运行本页的 `node` 命令则使用机器上已有的 Node。Python 项目的 Python/虚拟环境、Go 工具链和各项目依赖继续使用目标机器上的环境。

gopls 二进制由官方 `golang.org/x/tools/gopls@v0.21.1` 源码在本机交叉编译，构建工具链为 Go 1.26.1；源码校验、编译选项见 `sources/`。Linux 二进制关闭 CGO。现成二进制不需要在离线机器上再次执行 `go install`；目标机器仍须有与项目及该版本 gopls 兼容的 Go 工具链。[gopls 版本支持说明](https://go.dev/gopls/)

## 选择麒麟架构并校验

在麒麟执行 `uname -m`：

- `x86_64`：使用 `linux-x64/`。
- `aarch64`：使用 `linux-arm64/`。
- 其他结果（例如 `loongarch64`）：此包中的本机二进制不适用，需准备相应架构版本。

“V10”是系统版本，不能确定 CPU 架构。此包提供 Linux ARM64 依赖，不代表当前 CoTree Desktop 已完成 ARM64 打包与实机验证。

在本资源目录中运行：

```text
node verify.mjs
```

如只拷贝 `common/`、`sources/`、某个平台目录和根目录文件，可只校验该平台：

```text
node verify.mjs --platform windows-x64
node verify.mjs --platform linux-x64
node verify.mjs --platform linux-arm64
```

任选与目标机器对应的一条。校验命令只读取文件，不联网、不安装。

## Windows x64 部署

以下 PowerShell 命令从本资源目录执行，使用 Windows 自带的 `tar.exe`。目标目录已有内容时停止，避免覆盖既有配置；已有安装可按 [LSP 配置说明](../../docs/lsp-runtime.md) 指向独立的新目录。

```powershell
$ErrorActionPreference = 'Stop'
$cotreeDataRoot = if ($env:COTREE_HOME) { $env:COTREE_HOME } else { Join-Path $env:USERPROFILE '.cotree' }
$lspTarget = Join-Path $cotreeDataRoot 'runtimes/lsp'
if (Test-Path -LiteralPath $lspTarget) { throw "目标目录已存在，请先检查：$lspTarget" }
New-Item -ItemType Directory -Path $lspTarget,(Join-Path $lspTarget 'bin'),(Join-Path $lspTarget 'jdtls') | Out-Null
tar.exe -xzf common/node-language-servers.tar.gz -C $lspTarget
if ($LASTEXITCODE -ne 0) { throw 'Node 服务解压失败' }
tar.exe -xzf common/jdt-language-server-1.56.0-202601291528.tar.gz -C (Join-Path $lspTarget 'jdtls')
if ($LASTEXITCODE -ne 0) { throw 'JDT LS 解压失败' }
Copy-Item -LiteralPath windows-x64/gopls.exe -Destination (Join-Path $lspTarget 'bin/gopls.exe')
```

若使用随包 JDK，再执行：

```powershell
New-Item -ItemType Directory -Path (Join-Path $lspTarget 'jdk') | Out-Null
tar.exe -xf windows-x64/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip -C (Join-Path $lspTarget 'jdk') --strip-components=1
if ($LASTEXITCODE -ne 0) { throw 'JDK 解压失败' }
& (Join-Path $lspTarget 'jdk/bin/java.exe') -version
& (Join-Path $lspTarget 'bin/gopls.exe') version
```

## 麒麟 V10 部署

以下命令从本资源目录执行，适用于提供 POSIX shell 和 `tar` 的环境。会根据架构选包，并保留已有运行时目录。

```sh
set -eu
case "$(uname -m)" in
  x86_64) lsp_bundle_platform=linux-x64; lsp_jdk_arch=x64 ;;
  aarch64) lsp_bundle_platform=linux-arm64; lsp_jdk_arch=aarch64 ;;
  *) printf '%s\n' '本资源包不包含当前 CPU 架构'; exit 1 ;;
esac
cotree_data_root="${COTREE_HOME:-$HOME/.cotree}"
lsp_target="$cotree_data_root/runtimes/lsp"
if [ -e "$lsp_target" ]; then
  printf '目标目录已存在，请先检查：%s\n' "$lsp_target"
  exit 1
fi
mkdir -p "$lsp_target/bin" "$lsp_target/jdtls"
tar -xzf common/node-language-servers.tar.gz -C "$lsp_target"
tar -xzf common/jdt-language-server-1.56.0-202601291528.tar.gz -C "$lsp_target/jdtls"
cp "$lsp_bundle_platform/gopls" "$lsp_target/bin/gopls"
chmod 755 "$lsp_target/bin/gopls"
```

若使用随包 JDK，再执行：

```sh
mkdir "$lsp_target/jdk"
tar -xzf "$lsp_bundle_platform/OpenJDK21U-jdk_${lsp_jdk_arch}_linux_hotspot_21.0.12.1_1.tar.gz" -C "$lsp_target/jdk" --strip-components=1
"$lsp_target/jdk/bin/java" -version
"$lsp_target/bin/gopls" version
```

保留 Linux JDK 的原始 `.tar.gz` 到麒麟上再解压，以保留可执行权限和符号链接。不要把 Windows 解压后的 JDK 文件夹复制给麒麟使用。

## 已有 Java 环境与离线配置

已有 JDK 21+ 时，可以省略随包 JDK，通过 CoTree 的 `lsp.servers.java.javaHome` 或启动 CoTree 时的 `COTREE_LSP_JAVA_HOME` 指定其**绝对路径**。仅设置系统 `JAVA_HOME` 不会被当前 CoTree JDT LS 启动器自动选中。项目的 Java 8/17 等 JDK 仍可通过 `java.configuration.runtimes` 配置，独立于语言服务器启动 JDK。

以下示例合并到用户或工作区的 CoTree `config.json`，勿覆盖原有模型等设置。它适用于依赖已在本机缓存的完全离线项目；如果依赖由内网镜像提供，则应保留相应内网仓库配置。

```json
{
  "lsp": {
    "servers": {
      "go": {
        "env": { "GOTOOLCHAIN": "local", "GOPROXY": "off", "GOSUMDB": "off" }
      },
      "java": {
        "settings": {
          "java": {
            "import": {
              "maven": { "offline": { "enabled": true } },
              "gradle": { "offline": { "enabled": true } }
            },
            "maven": { "downloadSources": false, "updateSnapshots": false },
            "eclipse": { "downloadSources": false }
          }
        }
      }
    }
  }
}
```

Gradle 的离线模式仍需已有对应版本的 Gradle/Wrapper 分发缓存。Maven 仓库、Gradle 缓存、Go modules、npm 依赖及 Python 包属于具体项目，需使用目标机现有内容、内网仓库或另行搬运。带本机扩展的依赖要按操作系统和 CPU 架构准备。[JDT LS 设置](https://github.com/eclipse-jdtls/eclipse.jdt.ls/wiki/Running-the-JAVA-LS-server-from-the-command-line)、[Go 工具链选择](https://go.dev/doc/toolchain)

完成后重启 CoTree，在实际项目中让代码 Agent 调用 LSP 查询定义/引用。`status` 的“已配置”只代表检测到路径，实际查询成功才能证明服务器与项目索引可用。

## 来源、许可证与验证边界

npm 包来自 npm 官方注册表，下载后按发布的 SHA-512 校验；JDT LS 来自 Eclipse，JDK 来自 Eclipse Adoptium，均按上游 SHA-256 校验。已存在的本地原始下载仅在与上游校验值一致时复用。原始包内许可证保留；gopls 及构建依赖许可证额外保存在 `sources/licenses/`。

验证结果见本目录 `verification.json` 及 [执行记录](../../docs/exec-plans/lsp-offline-resources-2026-10-05.md)。麒麟的实际运行仍需在目标机验收；Windows 上的交叉编译、ELF 架构检查和压缩包校验不能替代麒麟实机测试。
