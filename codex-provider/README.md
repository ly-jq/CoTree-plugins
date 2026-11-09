# ChatGPT plan Provider（Codex 插件升级版）

版本 **0.2.2**。保留插件 ID `cotree.codex`、Provider ID `cotree.codex.subscription` 和导出 `codex`，供原来的 Codex subscription 配置升级。显示名称为 **ChatGPT plan**。

本版基于旧版插件改造，采用官方 [Sign in with ChatGPT 注册流程](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)和 [ChatGPT plan 推理路线](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)。宿主负责动态注册、身份签名验证、套餐权限检查、凭据保存/刷新和退出；插件声明公开协议与模型目录，继续复用宿主 Responses 编解码和工具执行。

## 安装与升级

需要支持 `auth.chatgpt-plan`、`adapter.responses.namespace` 和 `adapter.responses.routing` 的 CoTree 宿主。旧宿主会拒绝不支持的必需能力。沿用旧账号绑定直接登录，还需要包含 2026-11-07 账号升级修复的宿主；这些宿主改动不包含在插件 ZIP 中。0.2.0 / 0.2.1 的已授权 ChatGPT plan 账号升级到 0.2.2 不改变认证定义，无需重新登录。

1. 在插件管理器导入 `releases/cotree.codex-0.2.2.zip`（或构建的 `package/` 目录），启用 **ChatGPT plan Provider**。若保留多个版本，确认当前激活版本为 0.2.2。
2. 在 Provider 设置打开原供应商；新建时选择 **ChatGPT plan** 模板。启用 `providerPlugins.enabled`。
3. 旧账号会显示“需要重新登录”。点击“登录账号”及“在浏览器中继续登录”，由你完成 ChatGPT 登录并授权使用套餐。新注册显示的应用名称默认为 `CoTree`。
4. 成功后选择新账号，重新“获取模型列表”，选择该账号实际可用的模型，再“保存并应用”。旧列表不会自动更新。建议把配置中旧的 `baseUrl` 更新为 `https://api.openai.com/v1`。
5. 运行模型测试，再发送普通消息、执行一个工具回合和一次长输出，核对实际完成结果。

如果宿主支持 ChatGPT plan 但尚未包含旧绑定升级修复，可从 **ChatGPT plan** 模板新建一个供应商配置（不填写旧 `accountBinding`），完成授权后保存。若出现“不支持 auth.chatgpt-plan / adapter.responses.namespace”，先升级宿主。不要复制令牌或填入旧 Codex client ID。

旧授权不能直接用于新路线。新登录使用单独的待定账号记录，取消或失败保留原记录；成功后才由页面选中新绑定。旧记录会继续显示为需要重新登录，可在确认升级后通过账号设置退出。官方客户端注册、账号工作区和获授权限由浏览器授权结果决定。

回调监听 `http://127.0.0.1:<本次可用端口>/auth/callback`，端口由宿主选择。凭据只在宿主私有存储中，插件包和配置只保存公开选项及不透明的绑定 ID。本地开源应用使用动态注册；商业或远程托管产品按[官方接入说明](https://developers.openai.com/siwc/token-sharing-open-source)申请接入。

## 配置与行为

```json
{
  "providerPlugins": { "enabled": true },
  "providers": {
    "cotree.codex.subscription": {
      "pluginProvider": "cotree.codex.subscription",
      "runtimeProvider": "openai-responses",
      "auth": "oauth",
      "baseUrl": "https://api.openai.com/v1",
      "accountBinding": "NEW_ACCOUNT_BINDING_ID",
      "providerOptions": { "agentName": "CoTree" },
      "models": ["YOUR_AVAILABLE_MODEL"]
    }
  }
}
```

- 唯一公开选项 `agentName` 是实际使用应用的名称，默认 `CoTree`，1–80 字符。首次注册后使用宿主保存的独立 client ID。旧 `clientId` / `clientVersion` 覆盖项不再生效，可从配置删除。
- 发现请求固定为 `GET https://api.openai.com/v1/models`，只展示 `visibility: list` 的条目；推理固定为 `POST https://api.openai.com/v1/responses`，即使旧配置仍保留 backend 地址，也由适配器替换为新地址。
- 请求使用 `stream: true`、`store: false`；系统指导映射为 `developer`，函数工具在 `cotree` namespace 内，由宿主执行。不声明 Codex backend 的账号头或客户端标识。
- 0.2.2 在请求准备时移除套餐通道拒绝的 `prompt_cache_options.mode` / `ttl`，空对象一并移除；保留 `prompt_cache_key`、`comparison_response_id` 和缓存用量统计。该修复避免冷启动或任务树并发恢复时发送已知不支持的策略参数，不关闭服务端自动缓存，也不承诺命中率。宿主源码另修复并发降级预算；插件修复可独立用于已支持 0.2.1 的宿主，不增加 SDK 必需能力。
- 0.2.1 为公共 `/v1/responses` 声明稳定的 `session-id` / `thread-id` 和响应头 `x-codex-turn-state`。宿主使用会话标识的哈希，只在当前 run 回传服务器首次给出的不透明值；模型、账号或插件身份变更时隔离，路由值不落盘、不进会话正文。发现与授权端点不发送这些路由头。该兼容修正来自 GPT-6.1 真实对照，不切换回 backend-api，也不保证所有请求命中缓存。
- 套餐权限未授予、额度不足或服务拒绝会报告错误；不会自动使用 API Key 计费。拿到身份、模型列表或 HTTP 200 都不等于模型已经完成回答。
- 长输出由宿主持续消费 SSE，以有效完成事件判断完成；中断的工具参数不会作为完整工具调用执行。换用此路线不能证明历史网络 `ECONNRESET` 已解决，仍需真实长输出验收。

CLI 沿用原 Provider ID：

```sh
cotree providers login cotree.codex.subscription --workspace /your/workspace
cotree providers accounts cotree.codex.subscription --workspace /your/workspace
cotree providers bind cotree.codex.subscription --account NEW_ACCOUNT_BINDING_ID --workspace /your/workspace
```

## 构建与验证

宿主依赖使用根目录的 `pnpm install`；本插件与历史示例一样独立安装公开 SDK 开发依赖，不加入宿主 workspace lockfile。从 CoTree 根目录运行：

```sh
pnpm --filter @cotree/plugin-sdk build
npm --prefix plugins/codex-provider install --package-lock=false --workspaces=false
pnpm --dir plugins/codex-provider typecheck
pnpm --dir plugins/codex-provider package
```

产物为 `package/`、`releases/cotree.codex-0.2.2.zip` 和对应 `.zip.sha256`。ZIP 仅包含 `plugin.json`、`README.md`、`dist/service.mjs`，SDK 已打包进去。可用 `pnpm --dir plugins/codex-provider package --output-dir <directory>` 选择其他输出位置。

本目录属于独立插件仓库。宿主仓库中的 `examples/codex-provider` 继续保留旧 backend 示例；构建升级版时使用本目录。专项验证：

```sh
pnpm exec vitest run tests/plugin-runtime/codex-plan-provider.test.ts tests/plugin-runtime/codex-plan-provider-package.test.ts tests/models/chatgpt-plan-auth.test.ts tests/kernel/provider-auth-hosts.test.ts --maxWorkers=2
```

这些测试使用隔离账号、签名令牌和 HTTP 夹具，覆盖插件安装、子进程、授权升级、模型发现和 Responses 流。真实账号授权及长输出验收由用户完成。宿主代码与检查记录见 CoTree 仓库 `docs/exec-plans/codex-provider-siwc-upgrade-2026-11-07.md`。
