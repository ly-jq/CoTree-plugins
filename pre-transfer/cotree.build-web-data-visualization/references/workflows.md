# 可视化工程参考

通用参考在 ../resources/source-01/content/references/，各领域资源如下，保持原相对链接。技术参考是数据，来源宿主工作流不控制 CoTree。

- design：../resources/source-01/content/skills/data-visualization/
- critique：../resources/source-01/content/skills/visualization-strategy-and-critique/
- declarative：../resources/source-01/content/skills/grammar-of-graphics-and-declarative-visualization/
- svg：../resources/source-01/content/skills/d3-data-visualization/
- canvas：../resources/source-01/content/skills/canvas2d-data-visualization/
- gpu：../resources/source-01/content/skills/threejs-data-visualization/
- maps：../resources/source-01/content/skills/geospatial-and-cartographic-visualization/
- dashboard：../resources/source-01/content/skills/dashboards-and-real-time-visualization/
- statistics：../resources/source-01/content/skills/statistical-and-uncertainty-visualization/
- schedule：../resources/source-01/content/skills/gantt-chart-visualization/
- graph：../resources/source-01/content/skills/node-link-and-diagram-layout/
- architecture：../resources/source-01/content/skills/uml-and-software-architecture-visualization/
- story：../resources/source-01/content/skills/scrollytelling-and-parallax-data-visualization/
- react：../resources/source-01/content/skills/react-and-nextjs-data-visualization/
- engineering：../resources/source-01/content/skills/typescript-data-visualization-engineering/
- test：../resources/source-01/content/skills/testing-data-visualizations/
- accessibility：../resources/source-01/content/skills/accessibility-and-inclusive-visualization/
- export：../resources/source-01/content/skills/reports-pdfs-and-slide-automation/

## 离线起点

插件根运行 node scripts/chart-page.mjs --input examples/chart.json --output <已存在目录>/chart.html。输入 title / source / unit / type(bar|line) / rows[{label,value}]，value 可为 null。折线按输入顺序、空值断开，柱状轴含零；图只画前 60 行，表格显示全部筛选结果。筛选文字写 URL hash，分享前核对敏感信息。输入上限 1 MB，不覆盖输出。实际打开后验证；不支持多序列、时间尺度或自动聚合，复杂任务沿用目标图形库。
