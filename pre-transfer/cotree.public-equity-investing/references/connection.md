# 股票研究与本地计算

Python3.11+用于原完整计算资源，基础normalize/事件/公式XLSX路径使用标准库；其他原helper按其实际依赖另准备。新的scripts/equity-tools.py有normalize/dcf/three-statement/event四个明确入口，调用包内保留的已审查本地算法及shared依赖；normalize将数值转为原算法预期的文本单元格并保留cotree-normalization-input.json，修复0被当作缺失的问题，用户输入原文件保持不变。命令python scripts/equity-tools.py 动作 绝对输入JSON 绝对全新输出目录 [--mode cash_merger|stock_deal|scenario_ev|cvr] [--plan]。plan不执行，不读账户；实际运行限120秒，不写bytecode、不读取用户主目录、原表不覆盖。失败保留输出与helper日志，不冒充完成。

输入≤8MiB且数字有限；normalize要求明确entity/source_id/period_end/currency/units/source_location/evidence_label/freshness_status和原行名，不能因缺失生成默认身份或观察状态。DCF/三表必须source_basis/meta并使用源plan模板所声明schema；原样例全为演示，先替换真实输入。其他源helper可按具体领域参考在独立新目录使用，须先看--help与数据契约，不启动旧user-context脚本或导入隐藏账户。

工作簿模板携带公式，不由Python重算。需要实际Excel/兼容引擎重算再检查缓存值、跨表平衡/估值桥；原model_status/固定gate只是模板结构分类，不是研究完成、投资建议或流通审批。源状态若因资料缺失不确定，必须报告缺少哪项证据及后续读取，不把模板分类直接当CoTree运行结果。

市场数据优先用户授权文件、真实可调用连接器、监管/公司一手披露。收费行情/共识、交易所、地域市场、实时延迟与许可分别核实；不假定Bloomberg/FactSet/原宿主App可用。股票/基金/指数与信用工具研究边界保持；本包不下单、不保存经纪凭据。来源根目录完整保留，23技能相对资源链接仍在原位置。

偏好/来源指针由CoTree现有Memory按用户要求管理；定时监控只复用明确授权的宿主调度。现有方案/任务数据库仍为权威，不读写CODEX_HOME或创建另一个状态库。当前验证使用合成数据、模板公式和确定性计算，真实市场观点/投资结果、付费数据/账户、Excel重算均另验。
