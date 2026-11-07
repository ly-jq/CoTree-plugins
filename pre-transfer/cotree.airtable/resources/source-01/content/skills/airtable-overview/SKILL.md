---
name: "import.codex.airtable.airtable-overview"
description: "Explains what Airtable is and how data is structured — bases, tables, fields, records, views, automations, and interfaces. Use when you need context about the Airtable data model."
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

# Airtable Overview

Airtable is a no-code platform where teams build custom applications and AI-powered workflows from structured data. Users organize their data into bases, define tables with typed fields, set up automations to act on changes, and create interfaces that give different audiences tailored views of the same data.

## Data model

### Bases

A base is an Airtable database. It is the top-level container for all related data. A base contains one or more tables.

### Tables

A table is a collection of structured data within a base, similar to a sheet in a spreadsheet or a table in a relational database. Each table has a defined set of fields and contains records.

### Fields

A field defines a named, typed property on every record in a table.

### Records

A record is a single entry in a table. Each record has a unique ID and stores a cell value for each field defined on that table.

### Views

A view is a saved configuration for how to display records in a table. Views can filter, sort, group, and hide fields without changing the underlying data. Multiple views can exist on the same table, each showing the data differently.

## Automations

An automation is a workflow that runs in response to a defined trigger (e.g. a record entering a view) and executes one or more actions (e.g. sending an email or updating a record).

## Interfaces

Interfaces are custom app-like pages built on top of base data. They provide tailored, user-friendly ways to view and interact with records without exposing the full base structure or all of its data. A base can have multiple interfaces, each designed for a specific workflow or audience.

Some users can only access a base through its interfaces and cannot read or modify the underlying tables directly.
