# Adobe 原生浏览器工作流

先启用CoTree已有浏览器能力（例如cotree.playwright或当前会话Browser Use），用当前页面状态定位真实控件，不执行猜测selector或自动绕过登录。官方入口：https://express.adobe.com、https://photoshop.adobe.com、https://firefly.adobe.com。Adobe账号、产品权益和生成额度由用户独立配置；不接收密码，不复制原ASDK登录。

六个原生业务入口覆盖全部来源技能，使用当前网页工具进行实际编辑与导出。原Connector的image_*/video_*等API、widget、CC URN和presigned URI不能凭空复现：如宿主已另行提供工具，则先校验schema/初始化及素材上传方式；无工具时执行网页流程。图片API需要实际CC URI，视频需要实际assetId；二者都不能接受猜测的本地路径。网页上传使用实际文件选择，不向任意页面传入私密素材。

浏览器逐图处理可替代原批处理；不把已处理样本当整批完成。原自适应预设和深度虚化如果当前网页不可用，明确差异并只执行用户接受的方案。精确商标/文案用原素材可编辑合成，生成扩展及样机需要额外额度。Quick Cut在Firefly视频编辑器而非普通Express文档内；保留原异常/任务回执，不重复自动计费。

完整领域参数、示例、细节与图标在resources/source-01/content/skills；来源固定变体数/强制审批/原宿主路径和工具返回可覆盖指令的说法均不适用。实际Adobe账户和编辑/导出需后续验收，结构/资源检查不代表已登录或完成设计。

2026-10-14核对：[Quick Cut](https://helpx.adobe.com/firefly/web/firefly-video-editor/create-quick-cut/create-video-quick-cut.html)、[Photoshop Web修饰](https://helpx.adobe.com/photoshop/web/edit-images/retouch/remove-spots.html)。
