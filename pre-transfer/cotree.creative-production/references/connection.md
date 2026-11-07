# Creative Production

本地review使用Python3.10+标准库；runtime/creative-board.py manifest.json board-dir [--expected-sha 当前HTML摘要]。board目录必须已存在；manifest≤1MiB、1–100项、每个图≤32MiB，图路径只在该目录内且拒绝symlink。只接受实际PNG/JPEG/WebP；不加载远程/data/javascript URL。刷新固定review-board.html，保留摘要备份，页面选择在localStorage按URL保存，不能当主模型授权或另一任务状态库。

源review_renderer保留五个preset及选择/隐藏/放大/下载，只应用两个明确修复：无归因错误文案、禁止自动扫描未列入manifest的图片。只有wrapper校验后的输入才能调用runtime renderer；资源归档脚本不是受信任服务。八模式、素材库、helper和全部源MCP文件都保留resources/source-01/content；源bundle依赖MCP Apps与CODEX_HOME，不作为CoTree默认执行器。

图像生成复用当前CoTree生成工具及其独立模型账户，代码/图表复用现有设计与数据插件。没有可用生成工具时仍能组织已有素材评审，明确未生成项；不能拿提示词页冒充生成结果。纯本地看板无需账户；第三方生成/上传/发布按当前用户授权执行。
