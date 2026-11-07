# 生命科学接入与验证

Node 20+ 无依赖入口：

- node scripts/public-research.mjs --service uniprot --id P69905
- node scripts/public-research.mjs --service ensembl --id ENSG00000139618
- node scripts/public-research.mjs --service pdb --id 1A3N
- node scripts/public-research.mjs --service clinicaltrials --id NCT00000102

只访问固定官方HTTPS地址，不读取账户、不跟随重定向；每次20秒、2MiB，输出精简元数据及来源时间。身份不一致、限流或缺字段都报告证据缺口；不会自动重试或查询所有数据库。官方合同：[UniProt](https://www.uniprot.org/help/api_queries)、[Ensembl](https://rest.ensembl.org/documentation/info/lookup)、[RCSB](https://data.rcsb.org/)、[ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api)。核对日期2026-10-14。

其余数据库、GraphQL、PheWAS坐标转换和图表能力按source-index找到完整原技能和scripts。Python客户端多数使用requests，少数另调用CLI；在任务隔离环境检查import和实际参数，不自动安装全部依赖。旧脚本不是新的CoTree工具，也不是安全沙箱；先读目标脚本的输入、URL、header、save_raw及下载行为，按宿主权限使用。通用REST脚本接受stdin JSON，其他脚本以实际help/源码为准。脚本默认值和服务schema可能变化；没有逐一完成50个数据库的在线验收。

公开聚合数据与受控个体数据区分。NCBI key属于可选速率/服务身份，其他资源许可按具体来源；不自动借用浏览器cookie或上传私人序列。BLAST/大数据下载/受控队列另验。结果用于研究证据综合；临床、因果与实验结论需要相应证据。
