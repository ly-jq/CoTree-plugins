# 本地原型

bootstrap.mjs --name demo-app --output 新目录 [--template prototype|mobile-app]，父目录须存在。脚本拒绝已有目录、模板链接和逃逸路径，不执行安装 / 预览 / 发布。保留来源模板的固定依赖与 lockfile，npm ci 后使用项目命令；需要支持相应工具链的 Node，移动模板建议 Node 22.12+。

prototype 是 React 空画布；mobile-app 保留设备资产、滚动、底部弹层、手势、键盘、导航与 runtime 测试。源文件和 SHA-256 在 cotree-prototype-source.json；原运行库 bytes 保留，新的 integrity snapshot 仅移除 Sites 文件并覆盖本地 Vite 配置。更改运行库需按实际任务审查，不能直接禁用完整性检查。

Vite 仅绑定 127.0.0.1，构建目录为 dist。移除 worker、prepare-sites-build、Sites 测试和 terminal.local / 0.0.0.0；保留浏览器运行库测试。没有安装源 AGENTS.md 的固定宿主约定，正常项目规则仍优先。实际输出 URL 以进程为准，手机访问或公网隧道需另外明确范围。

来源弹层测试点击屏幕左上 (8, 8)，位于 42px 圆角裁剪外；生成时改为遮罩可见上部中央的真实鼠标点击，仍核对退出动画保留挂载与最终卸载。不使用 force / DOM 事件绕过命中，运行库源码与原测试快照均保留。

MCP / Figma / 图像生成和设计浏览器标注按工具能力发现，不推测平台支持。用图像 / URL 建立原型时优先复用已有组件和真实素材；结构测试不替代视觉对比，网页设备模拟不代表原生 App。
