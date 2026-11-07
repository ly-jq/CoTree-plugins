# 本地入口

Node 22+，模板锁定 hyperframes 0.8.139 / gsap 3.15.0；不是自动追随最新版。bootstrap 创建全新目录，不安装依赖、不写宿主技能。安装在工程目录，保留锁文件；用已安装项目 CLI，不能在完整性固定的插件里安装。

node scripts/hyperframes-local.mjs --workspace PROJECT --mode lint|inspect|render [--output NEW_DIRECTORY] [--execute]

默认只输出 argv。执行模式用 Node 参数数组调用本地 CLI，不经 Shell，不自动 npx 下载；render 独占创建新目录并写 video.mp4，失败保留部分结果，不自动删除。lint / inspect 也会运行项目 HTML、浏览器或编译缓存，并非沙箱。支持 SIGINT / SIGTERM 取消，用户宿主仍需管理该进程树。入口禁用上游匿名遥测；其他 CLI 配置和项目代码仍按正常权限执行。

HYPERFRAMES_BROWSER_PATH 可指向已核实 Chrome / Chromium，HYPERFRAMES_FFMPEG_PATH / HYPERFRAMES_FFPROBE_PATH 可指定工具；未配置时上游可能自行发现或下载浏览器。Windows 本机实测 Edge 可以执行 inspect，但 0.8.139 渲染前的 --version 探测超时；遇到相同现象应明确配置经核实的 Chrome Headless Shell，而不是把布局检查通过等同渲染可用。实际帮助与平台要求优先。预览推荐 foreground / no-open，使用实际返回的 Studio URL。其他格式、分辨率、GPU 或音轨按实际 CLI 和用户要求配置并单独验证。

2026-10-07 依据：[官方代码与说明](https://github.com/heygen-com/hyperframes)、[官方首页](https://hyperframes.heygen.com/)，并读取已安装 0.8.139 的 CLI help 和运行实现。
