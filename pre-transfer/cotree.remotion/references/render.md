# 本地渲染参数计划

Node 22+。node scripts/render-plan.mjs --input request.json [--output new-plan.json]。JSON 包含 workspace、entry（应用内真实文件）、composition、output（新文件）、format、fps、durationInFrames、width、height；可指定 PNG 的 frame、propsFile、browserExecutable 和 concurrency。先从实际 compositions 取得元数据，规划器不会执行源码或证明元数据真实。propsFile 用 JSON 文件，避免 Windows 的内联引号问题。

format：mp4 → h264/yuv420p/.mp4（偶数尺寸）；webm-alpha → vp9/yuva420p/png/.webm；prores-alpha → prores/4444/yuva444p10le/png/.mov；png → 单帧 PNG，frame 须在观察到的时长内。透明编码仍需 composition 背景透明。输出父目录必须存在，已有路径拒绝；CLI 同时传 --overwrite=false。width / height 显式传入，fps / duration 记录为期望值，实际输出需回查。

返回 command / args / cwd，不拼未转义的 Shell 文本。执行是宿主正常工具调用，保留取消与日志，不自动重试。CLI 可能执行项目代码、读取项目 .env、获取字体 / 媒体或下载 browser；本地参数规划器不读取环境或渲染。官方高级编码 / 图像序列等未在规划器开放的选项按文档用工程 CLI 操作并单独校验，不给规划器任意额外 flags。

[render CLI](https://www.remotion.dev/docs/cli/render)、[Studio](https://www.remotion.dev/docs/cli/studio)、[透明视频](https://www.remotion.dev/docs/transparent-videos)（2026-10-07）。
