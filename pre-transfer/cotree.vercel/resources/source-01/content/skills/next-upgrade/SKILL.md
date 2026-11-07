---
name: "import.codex.vercel.next-upgrade"
description: "Upgrade Next.js to the latest version following official migration guides and codemods. Use when upgrading Next.js versions, running codemods, or migrating between major releases."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Upgrade Next.js

Upgrade the current project to the latest Next.js version following official migration guides.

## Instructions

1. **Detect current version**: Read `package.json` to identify the current Next.js version and related dependencies (React, React DOM, etc.)

2. **Fetch the latest upgrade guide**: Use WebFetch to get the official upgrade documentation:
   - Codemods: https://nextjs.org/docs/app/guides/upgrading/codemods
   - Version-specific guides (adjust version as needed):
     - https://nextjs.org/docs/app/guides/upgrading/version-16
     - https://nextjs.org/docs/app/guides/upgrading/version-15
     - https://nextjs.org/docs/app/guides/upgrading/version-14

3. **Determine upgrade path**: Based on current version, identify which migration steps apply. For major version jumps, upgrade incrementally (e.g., 13 → 14 → 15).

4. **Run codemods first**: Next.js provides codemods to automate breaking changes:
   ```bash
   npx @next/codemod@latest <transform> <path>
   ```
   Common transforms:
   - `next-async-request-api` - Updates async Request APIs (v15)
   - `next-request-geo-ip` - Migrates geo/ip properties (v15)
   - `next-dynamic-access-named-export` - Transforms dynamic imports (v15)

5. **Update dependencies**: Upgrade Next.js and peer dependencies together:
   ```bash
   npm install next@latest react@latest react-dom@latest
   ```

6. **Review breaking changes**: Check the upgrade guide for manual changes needed:
   - API changes (e.g., async params in v15)
   - Configuration changes in `next.config.js`
   - Deprecated features being removed

7. **Update TypeScript types** (if applicable):
   ```bash
   npm install @types/react@latest @types/react-dom@latest
   ```

8. **Test the upgrade**:
   - Run `npm run build` to check for build errors
   - Run `npm run dev` and test key functionality
