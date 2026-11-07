# UI 组件归属与使用

cotree.vercel.ui 是 shadcn 的唯一入口。来源 Vercel 的配置、主题与 registry 指引保存在 resources/source-01/content/skills/shadcn/；网页开发来源的五份 rules 和 cli / customization / mcp 参考位于 references/shadcn/，可随本包独立使用，来源与摘要见 provenance/shared-resources.json。

先读 components.json、当前组件源码和类型，检查基础库 Radix / Base UI、Tailwind 和 CLI 版本。选择对应组合方式和受支持参数，避免盲目执行来源的 @latest、默认 init、--all 或覆盖命令。参考中的原宿主配置、命令插值和固定工具名都不直接执行；能力通过 CoTree ToolSearch / 当前 CLI 帮助发现。

优先语义 token、现有图标与可访问组件。Dialog 标题、焦点、键盘、表单错误与主题对比度需要真实 UI 验证。Geist、AI Elements 和 json-render 只按项目需要接入，不自动改消息协议或渲染器。
