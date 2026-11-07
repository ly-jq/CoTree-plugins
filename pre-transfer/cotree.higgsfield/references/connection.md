# Higgsfield 独立媒体工作流

固定官方MCP https://mcp.higgsfield.ai/mcp，OAuth用户和有效订阅独立核对，完整Bearer由COTREE_HIGGSFIELD_MCP_AUTHORIZATION提供；开发者API身份与此不同。登录/刷新与付费生成尚未验收。官方接入：https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent（2026-10-14核对）。

本地Node20+、FFmpeg/ffprobe（libx264、libass）。命令node scripts/media-finishing.mjs plan|run probe|assemble|burn request.json；probe {file:绝对媒体路径}；assemble {segments:[{file:绝对路径,kind:image或video,duration:秒}],width:1080,height:1920,fps:30,audio:可选绝对音频路径,output:全新绝对MP4}；burn {video:绝对MP4,srt:绝对字幕文件,output:全新绝对MP4}。argv无shell，120秒单命令上限，取消沿宿主进程；长片按片段处理。图像仅等比留边，原视频片段音轨不自动混入，使用显式旁白/音乐轨。

Python3.10+：runtime/audio_to_captions.py音频 --srt caps.srt --json words.json --script script_manifest.json --model 明确模型，依赖faster-whisper；模型初次下载需独立授权，不自动外发音频。它保留原稿对齐算法，不把低相似度当识别通过。paper字幕runtime/subtitle_paper_burn.py --in input.mp4 --srt caps.srt --out new.mp4 --font 已授权字体，需Pillow/numpy；默认paper样式保留原字，bold会转大写且需用户选择。原Bash和全部风格资料归档，默认不运行。

本地合成测试不证明字幕语义、音色、模型生成或真实发布；最终需看实际帧、听实际声音。没有原专属HF_WORKFLOWS/sandbox后台，本地文件和真实MCP回执用于任务恢复。
