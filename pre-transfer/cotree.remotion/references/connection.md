# 可选服务与本地渲染

本地示例和渲染无需云身份。EAS 与此无关；ElevenLabs 配音、外部转写、地图 API、Lambda / 其他云渲染分别需要独立服务账户和授权。按所选 SDK 的官方变量和服务端存储配置，不假设来源 ELEVENLABS_API_KEY / REMOTION_GOOGLE_MAPS_API_KEY 自动成为 CoTree 绑定。不得把私密服务 key 注入可下载视频 bundle。

模板只固定本地参考版本；团队 / 商用用途按当前 [Remotion 许可](https://www.remotion.dev/license)核实适用条件，本包不签发许可。云成本、账户和真实业务不由本地渲染测试认证。没有自动获取 / 刷新服务 token。
