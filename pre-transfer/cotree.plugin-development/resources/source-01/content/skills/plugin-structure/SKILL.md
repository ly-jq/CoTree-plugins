---
name: "import.claude.plugin-dev.plugin-structure"
description: "This skill should be used when the user asks to \"create a plugin\", \"scaffold a plugin\", \"understand plugin structure\", \"organize plugin components\", \"set up plugin.json\", \"use ${CLAUDE_PLUGIN_ROOT}\", \"add commands/agents/skills/hooks\", \"configure auto-discovery\", or needs guidance on plugin directory layout, manifest configuration, component organization, file naming conventions, or Claude Code plugin architecture best practices."
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

# Plugin Structure for Claude Code

## Overview

Claude Code plugins follow a standardized directory structure with automatic component discovery. Understanding this structure enables creating well-organized, maintainable plugins that integrate seamlessly with Claude Code.

**Key concepts:**
- Conventional directory layout for automatic discovery
- Manifest-driven configuration in `.claude-plugin/plugin.json`
- Component-based organization (commands, agents, skills, hooks)
- Portable path references using `<plugin-resource-root>`
- Explicit vs. auto-discovered component loading

## Directory Structure

Every Claude Code plugin follows this organizational pattern:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Required: Plugin manifest
├── commands/                 # Slash commands (.md files)
├── agents/                   # Subagent definitions (.md files)
├── skills/                   # Agent skills (subdirectories)
│   └── skill-name/
│       └── SKILL.md         # Required for each skill
├── hooks/
│   └── hooks.json           # Event handler configuration
├── .mcp.json                # MCP server definitions
└── scripts/                 # Helper scripts and utilities
```

**Critical rules:**

1. **Manifest location**: The `plugin.json` manifest MUST be in `.claude-plugin/` directory
2. **Component locations**: All component directories (commands, agents, skills, hooks) MUST be at plugin root level, NOT nested inside `.claude-plugin/`
3. **Optional components**: Only create directories for components the plugin actually uses
4. **Naming convention**: Use kebab-case for all directory and file names

## Plugin Manifest (plugin.json)

The manifest defines plugin metadata and configuration. Located at `.claude-plugin/plugin.json`:

### Required Fields

```json
{
  "name": "plugin-name"
}
```

**Name requirements:**
- Use kebab-case format (lowercase with hyphens)
- Must be unique across installed plugins
- No spaces or special characters
- Example: `code-review-assistant`, `test-runner`, `api-docs`

### Recommended Metadata

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Brief explanation of plugin purpose",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://docs.example.com",
  "repository": "https://github.com/user/plugin-name",
  "license": "MIT",
  "keywords": ["testing", "automation", "ci-cd"]
}
```

**Version format**: Follow semantic versioning (MAJOR.MINOR.PATCH)
**Keywords**: Use for plugin discovery and categorization

### Component Path Configuration

Specify custom paths for components (supplements default directories):

```json
{
  "name": "plugin-name",
  "commands": "./custom-commands",
  "agents": ["./agents", "./specialized-agents"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

**Important**: Custom paths supplement defaults—they don't replace them. Components in both default directories and custom paths will load.

**Path rules:**
- Must be relative to plugin root
- Must start with `./`
- Cannot use absolute paths
- Support arrays for multiple locations

## Component Organization

### Commands

**Location**: `commands/` directory
**Format**: Markdown files with YAML frontmatter
**Auto-discovery**: All `.md` files in `commands/` load automatically

**Example structure**:
```
commands/
├── review.md        # /review command
├── test.md          # /test command
└── deploy.md        # /deploy command
```

**File format**:
```markdown
---
name: command-name
description: Command description
---

Command implementation instructions...
```

**Usage**: Commands integrate as native slash commands in Claude Code

### Agents

**Location**: `agents/` directory
**Format**: Markdown files with YAML frontmatter
**Auto-discovery**: All `.md` files in `agents/` load automatically

**Example structure**:
```
agents/
├── code-reviewer.md
├── test-generator.md
└── refactorer.md
```

**File format**:
```markdown
---
description: Agent role and expertise
capabilities:
  - Specific task 1
  - Specific task 2
---

Detailed agent instructions and knowledge...
```

**Usage**: Users can invoke agents manually, or Claude Code selects them automatically based on task context

### Skills

**Location**: `skills/` directory with subdirectories per skill
**Format**: Each skill in its own directory with `SKILL.md` file
**Auto-discovery**: All `SKILL.md` files in skill subdirectories load automatically

**Example structure**:
```
skills/
├── api-testing/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── test-runner.py
│   └── references/
│       └── api-spec.md
└── database-migrations/
    ├── SKILL.md
    └── examples/
        └── migration-template.sql
```

**SKILL.md format**:
```markdown
---
name: Skill Name
description: When to use this skill
version: 1.0.0
---

Skill instructions and guidance...
```

**Supporting files**: Skills can include scripts, references, examples, or assets in subdirectories

**Usage**: Claude Code autonomously activates skills based on task context matching the description

### Hooks

**Location**: `hooks/hooks.json` or inline in `plugin.json`
**Format**: JSON configuration defining event handlers
**Registration**: Hooks register automatically when plugin enables

**Example structure**:
```
hooks/
├── hooks.json           # Hook configuration
└── scripts/
    ├── validate.sh      # Hook script
    └── check-style.sh   # Hook script
```

**Configuration format**:
```json
{
  "PreToolUse": [{
    "matcher": "Write|Edit",
    "hooks": [{
      "type": "command",
      "command": "bash <plugin-resource-root>/hooks/scripts/validate.sh",
      "timeout": 30
    }]
  }]
}
```

**Available events**: PreToolUse, PostToolUse, Stop, SubagentStop, SessionStart, SessionEnd, UserPromptSubmit, PreCompact, Notification

**Usage**: Hooks execute automatically in response to Claude Code events

### MCP Servers

**Location**: `.mcp.json` at plugin root or inline in `plugin.json`
**Format**: JSON configuration for MCP server definitions
**Auto-start**: Servers start automatically when plugin enables

**Example format**:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["<plugin-resource-root>/servers/server.js"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

**Usage**: MCP servers integrate seamlessly with Claude Code's tool system

## Portable Path References

### <plugin-resource-root>

Use `<plugin-resource-root>` environment variable for all intra-plugin path references:

```json
{
  "command": "bash <plugin-resource-root>/scripts/run.sh"
}
```

**Why it matters**: Plugins install in different locations depending on:
- User installation method (marketplace, local, npm)
- Operating system conventions
- User preferences

**Where to use it**:
- Hook command paths
- MCP server command arguments
- Script execution references
- Resource file paths

**Never use**:
- Hardcoded absolute paths (`/Users/name/plugins/...`)
- Relative paths from working directory (`./scripts/...` in commands)
- Home directory shortcuts (`~/plugins/...`)

### Path Resolution Rules

**In manifest JSON fields** (hooks, MCP servers):
```json
"command": "<plugin-resource-root>/scripts/tool.sh"
```

**In component files** (commands, agents, skills):
```markdown
Reference scripts at: <plugin-resource-root>/scripts/helper.py
```

**In executed scripts**:
```bash
#!/bin/bash
# <plugin-resource-root> available as environment variable
source "<plugin-resource-root>/lib/common.sh"
```

## File Naming Conventions

### Component Files

**Commands**: Use kebab-case `.md` files
- `code-review.md` → `/code-review`
- `run-tests.md` → `/run-tests`
- `api-docs.md` → `/api-docs`

**Agents**: Use kebab-case `.md` files describing role
- `test-generator.md`
- `code-reviewer.md`
- `performance-analyzer.md`

**Skills**: Use kebab-case directory names
- `api-testing/`
- `database-migrations/`
- `error-handling/`

### Supporting Files

**Scripts**: Use descriptive kebab-case names with appropriate extensions
- `validate-input.sh`
- `generate-report.py`
- `process-data.js`

**Documentation**: Use kebab-case markdown files
- `api-reference.md`
- `migration-guide.md`
- `best-practices.md`

**Configuration**: Use standard names
- `hooks.json`
- `.mcp.json`
- `plugin.json`

## Auto-Discovery Mechanism

Claude Code automatically discovers and loads components:

1. **Plugin manifest**: Reads `.claude-plugin/plugin.json` when plugin enables
2. **Commands**: Scans `commands/` directory for `.md` files
3. **Agents**: Scans `agents/` directory for `.md` files
4. **Skills**: Scans `skills/` for subdirectories containing `SKILL.md`
5. **Hooks**: Loads configuration from `hooks/hooks.json` or manifest
6. **MCP servers**: Loads configuration from `.mcp.json` or manifest

**Discovery timing**:
- Plugin installation: Components register with Claude Code
- Plugin enable: Components become available for use
- No restart required: Changes take effect on next Claude Code session

**Override behavior**: Custom paths in `plugin.json` supplement (not replace) default directories

## Best Practices

### Organization

1. **Logical grouping**: Group related components together
   - Put test-related commands, agents, and skills together
   - Create subdirectories in `scripts/` for different purposes

2. **Minimal manifest**: Keep `plugin.json` lean
   - Only specify custom paths when necessary
   - Rely on auto-discovery for standard layouts
   - Use inline configuration only for simple cases

3. **Documentation**: Include README files
   - Plugin root: Overall purpose and usage
   - Component directories: Specific guidance
   - Script directories: Usage and requirements

### Naming

1. **Consistency**: Use consistent naming across components
   - If command is `test-runner`, name related agent `test-runner-agent`
   - Match skill directory names to their purpose

2. **Clarity**: Use descriptive names that indicate purpose
   - Good: `api-integration-testing/`, `code-quality-checker.md`
   - Avoid: `utils/`, `misc.md`, `temp.sh`

3. **Length**: Balance brevity with clarity
   - Commands: 2-3 words (`review-pr`, `run-ci`)
   - Agents: Describe role clearly (`code-reviewer`, `test-generator`)
   - Skills: Topic-focused (`error-handling`, `api-design`)

### Portability

1. **Always use <plugin-resource-root>**: Never hardcode paths
2. **Test on multiple systems**: Verify on macOS, Linux, Windows
3. **Document dependencies**: List required tools and versions
4. **Avoid system-specific features**: Use portable bash/Python constructs

### Maintenance

1. **Version consistently**: Update version in plugin.json for releases
2. **Deprecate gracefully**: Mark old components clearly before removal
3. **Document breaking changes**: Note changes affecting existing users
4. **Test thoroughly**: Verify all components work after changes

## Common Patterns

### Minimal Plugin

Single command with no dependencies:
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json    # Just name field
└── commands/
    └── hello.md       # Single command
```

### Full-Featured Plugin

Complete plugin with all component types:
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/          # User-facing commands
├── agents/            # Specialized subagents
├── skills/            # Auto-activating skills
├── hooks/             # Event handlers
│   ├── hooks.json
│   └── scripts/
├── .mcp.json          # External integrations
└── scripts/           # Shared utilities
```

### Skill-Focused Plugin

Plugin providing only skills:
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

## Troubleshooting

**Component not loading**:
- Verify file is in correct directory with correct extension
- Check YAML frontmatter syntax (commands, agents, skills)
- Ensure skill has `SKILL.md` (not `README.md` or other name)
- Confirm plugin is enabled in Claude Code settings

**Path resolution errors**:
- Replace all hardcoded paths with `<plugin-resource-root>`
- Verify paths are relative and start with `./` in manifest
- Check that referenced files exist at specified paths
- Test with `echo $CLAUDE_PLUGIN_ROOT` in hook scripts

**Auto-discovery not working**:
- Confirm directories are at plugin root (not in `.claude-plugin/`)
- Check file naming follows conventions (kebab-case, correct extensions)
- Verify custom paths in manifest are correct
- Restart Claude Code to reload plugin configuration

**Conflicts between plugins**:
- Use unique, descriptive component names
- Namespace commands with plugin name if needed
- Document potential conflicts in plugin README
- Consider command prefixes for related functionality

---

For detailed examples and advanced patterns, see files in `references/` and `examples/` directories.
