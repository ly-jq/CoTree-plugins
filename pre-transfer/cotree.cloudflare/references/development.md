# 开发与发布

1. 读取项目入口、锁文件、配置、生成类型与测试，先确定需求对应产品和环境。新建项目使用当时官方支持的模板，先检查生成文件，不在当前非空项目覆盖初始化。
2. 按项目固定依赖实现。bindings、compatibility_date、迁移、队列 / Workflow、静态资源、环境变量 / secrets 分开；演示代码不证明生产并发、身份或套餐可用。
3. 用项目现有测试与适合 Workers 的运行环境验证；本地模拟器不等于生产服务。Docker、浏览器 trace、云账户等缺失条件准确记录。
4. 有授权的发布先核对账户、环境、路由、版本及数据迁移，再执行和读回。交付构建、版本 / URL、实际检查和未验收范围。远程请求、DNS / 路由改动和计费资源都依任务范围。

官方入口：[Workers](https://developers.cloudflare.com/workers/)、[Durable Objects](https://developers.cloudflare.com/durable-objects/)、[Agents](https://developers.cloudflare.com/agents/)、[Sandbox](https://developers.cloudflare.com/sandbox/)、[Wrangler](https://developers.cloudflare.com/workers/wrangler/)。
