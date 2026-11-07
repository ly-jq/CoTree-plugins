# __APP_NAME__

独立 OpenAI Agent SDK python 示例。不会安装到 CoTree，也不会替换其 agent / kernel。模板仅提供一个无工具的文本入口；按任务加入最小工具集合和持久化。

先在本目录安装固定依赖并保存 lock。使用独立 Python 3.10+ venv 安装 requirements.txt；python main.py --check 离线导入 / 构造；python main.py "用户输入" 才运行模型。

真实运行需要 OPENAI_API_KEY / OPENAI_MODEL 从安全环境注入；.env.example 只是变量说明，不自动加载。本例要求显式模型，先核对目标项目可用模型。CoTree / ChatGPT 登录不代表应用 API 身份。check 使用标明为离线夹具的模型字符串，不发送请求。

默认最多三轮，90 秒超时；关闭 tracing 导出；只有用户需要观测时再明确数据范围和目标。错误只报类别，不打印原始异常或环境。

实际模型输出、工具授权 / 取消、账单及部署尚需真实环境验证。离线构造不证明回答质量。部署沿用工程现有入口，不能把 CLI 样例称为 HTTP 服务。
