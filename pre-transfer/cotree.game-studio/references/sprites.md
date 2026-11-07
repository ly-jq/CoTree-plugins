# 精灵处理

Python 3.10+ 与 Pillow。相对于插件根：

- python runtime/build_sprite_edit_canvas.py --seed seed.png --out new-canvas.png --frames 4 --slot-size 256 --canvas-size 1024
- python runtime/normalize_sprite_strip.py --input strip.png --out-dir new-frames --frames 4 --frame-size 64 [--anchor seed.png --lock-frame1]
- python runtime/render_sprite_preview_sheet.py --frames-dir new-frames --out new-preview.png --columns 4

运行副本保留来源算法；PNG 输出用独占创建，帧目录必须全新（即便空目录也拒绝），失败时保留部分输出供检查，不自动删除。图像 / 合并帧 / 预览最多 16M 像素，帧数最多 256；normalize 要求 strip 宽度整除帧数，避免边界切错。所有输入限额在分配对应输出前检查；预览图有棋盘底，透明帧仍保留透明。输入图片不是生成结果证明；游戏内需另验动画。
