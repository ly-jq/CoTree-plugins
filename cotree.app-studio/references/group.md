# Group 操作与交接

当前模型入口为 SessionControl action=delegate/message；SessionQuery 查询，SessionWorktree 集成。插件 Coordinate 是 SDK 的窄适配，也接受原字段；它不创建另一套组。

首次需要 Group 时用 SessionControl `{action:"evolve",targets:["self"],reason:"需要持久成员并行开发三端并联调"}`，遵循原审批/阻断回执。已有 Group 不重复演化。

创建示例（依据当前切片改写目标，不照抄空路径）：

```json
{"action":"delegate","mode":"create","maxConcurrency":3,"items":[
  {"id":"backend","agent":"cotree.app-studio.backend","workspaceIsolation":"worktree","objective":"读取本切片规则与契约，完成后端和API测试；只修改后端与迁移。"},
  {"id":"web","agent":"cotree.app-studio.web","workspaceIsolation":"worktree","objective":"读取同一契约，实现用户旅程；共享依赖变更交给契约所有者。"},
  {"id":"admin","agent":"cotree.app-studio.admin","workspaceIsolation":"worktree","objective":"读取同一契约，实现管理旅程和审计展示。"}
]}
```

模板不是静态 DAG：需要契约时先创建业务成员并集成共享基线，再并行实现；无 Git 时先初始化获准的新项目，或明确用 shared 隔离加文件责任。after 表达真正输入依赖。集成成员需精确的产物依赖及控制工作区写权限，不能凭路径自行取得权限。

成员报告会自动投递到原协调者。已结算成员使用 `{action:"delegate",mode:"continue",items:[{ref:"原回执中的member ref",objective:"具体修复与验证目标"}]}`；运行中成员用 message，消息目标为 sessionId。以上占位是解释引用位置，实际调用必须复制宿主返回身份。

共享主题 finding/contract/issue/patch_summary 发布摘要与 evidenceRefs；artifactRef 只能用宿主不可变引用。普通 FYI 不启动空闲成员，需执行则由协调者续派。依赖交接不足时按 reportRead/nextQuery 读取原报告，不让成员重做。

等待使用原 waitRef；响应丢失查询原记录再决定。结果/执行结算/业务目标完成分别呈现。修复必须报告实际作者和版本，不新增永久“修复组”。
