# 原生现代化

6个入口覆盖13个命令和8个专业角色。全部源脚本、HTML、模板和资料在resources/source-01/content保留。原宿主面板/工作流/状态库不加载，报告通过本地文件展示；按需参考领域角色，不强制委派。

Node 20+：node scripts/modernization-evidence.mjs cases.json 全新输出目录。cases.json格式：{"system":"billing","cases":[{"id":"case-1","legacy":"old.out","modern":"new.out"}]}，两份输出必须位于cases文件目录内。只比较已有输出；不执行旧代码，不将字节相同认定业务迁移完成。输出comparison.json和report.html，目录已存在拒绝覆盖。

上游compare.py等深层工具完整保留但其proof签署/固定流程不是当前完成合同；先审查工具输入、依赖和输出再按授权选用。本包不运行遥测脚本或外部安全扫描。
