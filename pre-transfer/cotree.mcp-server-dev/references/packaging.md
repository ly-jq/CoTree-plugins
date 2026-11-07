# 原生 MCP 包

scaffold.mjs 只向不存在的目录写文件，父目录须已存在；拒绝覆盖，包括空目录。部分写入失败会保留新目录供检查，不删除用户内容。生成项目包含 server.mjs、pack.mjs 和固定版本依赖，正常安装依赖后可直接运行。

pack.mjs 通过 esbuild 捆绑 JS 依赖，生成 CoTree Manifest v3。服务使用 cwdBase=plugin 与相对 server.mjs，目标机仍需 Node 20.19+。没有将 MCPB 的 user_config / keychain / 打包运行库暗中映射为已支持。第三方许可随输出保留；新增原生模块须单独解决平台二进制。

先检查样例 handler 与权限，再隔离安装、列目录、调用、读取 resource / prompt、禁用并确认贡献清空。包摘要由现有安装 / 更新合同校验。单独使用 loopback HTTP 样例时手动配置真实 URL，不添加永久远程服务；不要暴露 0.0.0.0 或绕过访问控制。
