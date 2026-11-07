---
name: "import.claude.agent-sdk-dev.command.new-sdk-app"
description: "Create and setup a new Claude Agent SDK application"
disable-model-invocation: true
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

Resource root: resolve `..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

This former slash command is an explicitly requested Elyra Skill. Bind <user-supplied-arguments> / <user-argument-N> from the actual request; ask only for required missing values. There is no import-time Shell or automatic slash-command expansion.

## 工作内容

You are tasked with helping the user create a new Claude Agent SDK application. Follow these steps carefully:

## Reference Documentation

Before starting, review the official documentation to ensure you provide accurate and up-to-date guidance. Use WebFetch to read these pages:

1. **Start with the overview**: https://docs.claude.com/en/api/agent-sdk/overview
2. **Based on the user's language choice, read the appropriate SDK reference**:
   - TypeScript: https://docs.claude.com/en/api/agent-sdk/typescript
   - Python: https://docs.claude.com/en/api/agent-sdk/python
3. **Read relevant guides mentioned in the overview** such as:
   - Streaming vs Single Mode
   - Permissions
   - Custom Tools
   - MCP integration
   - Subagents
   - Sessions
   - Any other relevant guides based on the user's needs

**IMPORTANT**: Always check for and use the latest versions of packages. Use WebSearch or WebFetch to verify current versions before installation.

## Gather Requirements

IMPORTANT: Ask these questions one at a time. Wait for the user's response before asking the next question. This makes it easier for the user to respond.

Ask the questions in this order (skip any that the user has already provided via arguments):

1. **Language** (ask first): "Would you like to use TypeScript or Python?"

   - Wait for response before continuing

2. **Project name** (ask second): "What would you like to name your project?"

   - If <user-supplied-arguments> is provided, use that as the project name and skip this question
   - Wait for response before continuing

3. **Agent type** (ask third, but skip if #2 was sufficiently detailed): "What kind of agent are you building? Some examples:

   - Coding agent (SRE, security review, code review)
   - Business agent (customer support, content creation)
   - Custom agent (describe your use case)"
   - Wait for response before continuing

4. **Starting point** (ask fourth): "Would you like:

   - A minimal 'Hello World' example to start
   - A basic agent with common features
   - A specific example based on your use case"
   - Wait for response before continuing

5. **Tooling choice** (ask fifth): Let the user know what tools you'll use, and confirm with them that these are the tools they want to use (for example, they may prefer pnpm or bun over npm). Respect the user's preferences when executing on the requirements.

After all questions are answered, proceed to create the setup plan.

## Setup Plan

Based on the user's answers, create a plan that includes:

1. **Project initialization**:

   - Create project directory (if it doesn't exist)
   - Initialize package manager:
     - TypeScript: `npm init -y` and setup `package.json` with type: "module" and scripts (include a "typecheck" script)
     - Python: Create `requirements.txt` or use `poetry init`
   - Add necessary configuration files:
     - TypeScript: Create `tsconfig.json` with proper settings for the SDK
     - Python: Optionally create config files if needed

2. **Check for Latest Versions**:

   - BEFORE installing, use WebSearch or check npm/PyPI to find the latest version
   - For TypeScript: Check https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
   - For Python: Check https://pypi.org/project/claude-agent-sdk/
   - Inform the user which version you're installing

3. **SDK Installation**:

   - TypeScript: `npm install @anthropic-ai/claude-agent-sdk@latest` (or specify latest version)
   - Python: `pip install claude-agent-sdk` (pip installs latest by default)
   - After installation, verify the installed version:
     - TypeScript: Check package.json or run `npm list @anthropic-ai/claude-agent-sdk`
     - Python: Run `pip show claude-agent-sdk`

4. **Create starter files**:

   - TypeScript: Create an `index.ts` or `src/index.ts` with a basic query example
   - Python: Create a `main.py` with a basic query example
   - Include proper imports and basic error handling
   - Use modern, up-to-date syntax and patterns from the latest SDK version

5. **Environment setup**:

   - Create a `.env.example` file with `ANTHROPIC_API_KEY=your_api_key_here`
   - Add `.env` to `.gitignore`
   - Explain how to get an API key from https://console.anthropic.com/

6. **Optional: Create .claude directory structure**:
   - Offer to create `.claude/` directory for agents, commands, and settings
   - Ask if they want any example subagents or slash commands

## Implementation

After gathering requirements and getting user confirmation on the plan:

1. Check for latest package versions using WebSearch or WebFetch
2. Execute the setup steps
3. Create all necessary files
4. Install dependencies (always use latest stable versions)
5. Verify installed versions and inform the user
6. Create a working example based on their agent type
7. Add helpful comments in the code explaining what each part does
8. **VERIFY THE CODE WORKS BEFORE FINISHING**:
   - For TypeScript:
     - Run `npx tsc --noEmit` to check for type errors
     - Fix ALL type errors until types pass completely
     - Ensure imports and types are correct
     - Only proceed when type checking passes with no errors
   - For Python:
     - Verify imports are correct
     - Check for basic syntax errors
   - **DO NOT consider the setup complete until the code verifies successfully**

## Verification

After all files are created and dependencies are installed, use the appropriate verifier agent to validate that the Agent SDK application is properly configured and ready for use:

1. **For TypeScript projects**: Launch the **agent-sdk-verifier-ts** agent to validate the setup
2. **For Python projects**: Launch the **agent-sdk-verifier-py** agent to validate the setup
3. The agent will check SDK usage, configuration, functionality, and adherence to official documentation
4. Review the verification report and address any issues

## Getting Started Guide

Once setup is complete and verified, provide the user with:

1. **Next steps**:

   - How to set their API key
   - How to run their agent:
     - TypeScript: `npm start` or `node --loader ts-node/esm index.ts`
     - Python: `python main.py`

2. **Useful resources**:

   - Link to TypeScript SDK reference: https://docs.claude.com/en/api/agent-sdk/typescript
   - Link to Python SDK reference: https://docs.claude.com/en/api/agent-sdk/python
   - Explain key concepts: system prompts, permissions, tools, MCP servers

3. **Common next steps**:
   - How to customize the system prompt
   - How to add custom tools via MCP
   - How to configure permissions
   - How to create subagents

## Important Notes

- **ALWAYS USE LATEST VERSIONS**: Before installing any packages, check for the latest versions using WebSearch or by checking npm/PyPI directly
- **VERIFY CODE RUNS CORRECTLY**:
  - For TypeScript: Run `npx tsc --noEmit` and fix ALL type errors before finishing
  - For Python: Verify syntax and imports are correct
  - Do NOT consider the task complete until the code passes verification
- Verify the installed version after installation and inform the user
- Check the official documentation for any version-specific requirements (Node.js version, Python version, etc.)
- Always check if directories/files already exist before creating them
- Use the user's preferred package manager (npm, yarn, pnpm for TypeScript; pip, poetry for Python)
- Ensure all code examples are functional and include proper error handling
- Use modern syntax and patterns that are compatible with the latest SDK version
- Make the experience interactive and educational
- **ASK QUESTIONS ONE AT A TIME** - Do not ask multiple questions in a single response

Begin by asking the FIRST requirement question only. Wait for the user's answer before proceeding to the next question.
