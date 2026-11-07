---
name: "import.codex.life-science-research.locus-to-gene-mapper-skill"
description: "Map GWAS loci to ranked candidate genes using a deterministic multi-skill chain (EFO -> GWAS -> coordinates -> Open Targets L2G/coloc -> eQTL -> burden/coding context), with reproducible tables and optional figures. Use when a user provides a trait/EFO term and/or lead variants and needs locus-to-gene prioritization for downstream biology decisions."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

## Locus-to-Gene Mapper

Generate a reproducible locus-to-gene mapping for one trait (or a seed set of lead variants), with explicit evidence attribution and conservative confidence labels.

This skill is optimized for bioinformaticians who need executable, traceable mapping from variant signals to plausible causal genes.

## Required Inputs

Provide at least one anchor source:

- `trait_query` (string), for example `chronic obstructive pulmonary disease`
- `efo_id` (string), for example `EFO_0000341`
- `seed_rsids` (list[string]), for example `["rs1873625", "rs7903146"]`

## Optional Inputs

- `target_gene` (string), optional gene of interest for highlighting in output
- `show_child_traits` (bool), default `true`
- `phenotype_terms` (list[string]), optional additional terms to include when finding anchors
- `max_anchor_associations` (int), default `1200`
- `max_loci` (int), default `25`
- `max_genes_per_locus` (int), default `10`
- `max_coloc_rows_per_locus` (int), default `100`
- `max_eqtl_rows_per_variant` (int), default `200`
- `genebass_burden_sets` (list[string]), default `["pLoF", "missense|LC"]`
- `include_clinvar` (bool), default `true`
- `include_gnomad_context` (bool), default `true`
- `include_hpa_tissue_context` (bool), default `true`
- `include_figures` (bool), default `false`
- `disable_default_seeds` (bool), default `false`; if `false`, common traits automatically get built-in seed rsIDs
- `figure_output_dir` (string), default `./output/figures`
- `mapping_output_path` (string), default `./output/locus_to_gene_mapping.json`
- `summary_output_path` (string), default `./output/locus_to_gene_summary.md`

## Runtime Requirements

- Python `3.11+`
- `requests`
- Optional for figure generation: `matplotlib`, `seaborn`, `pandas`

## Bundled Script (Deterministic Runner)

- Primary entrypoint: `scripts/map_locus_to_gene.py`
- This script:
  - resolves trait/EFO and anchor variants,
  - resolves seed and anchor rsID coordinates directly through NCBI RefSNP/dbSNP placements,
  - gathers locus-to-gene evidence through the chained skills,
  - writes mapping JSON and summary markdown,
  - optionally renders figures when plotting deps are available.

Run:

```bash
python locus-to-gene-mapper-skill/scripts/map_locus_to_gene.py \
  --input-json /path/to/input.json \
  --print-result
```

Quick start (no input JSON file):

```bash
python locus-to-gene-mapper-skill/scripts/map_locus_to_gene.py \
  --trait-query "type 2 diabetes" \
  --print-result
```

Trait-only runs default to `include_figures=true` unless explicitly disabled with `--no-include-figures`.

Minimal input JSON:

```json
{
  "trait_query": "type 2 diabetes"
}
```

Built-in default seeds (when `disable_default_seeds=false`):

- `type 2 diabetes` / `t2d` -> `rs7903146`, `rs13266634`, `rs7756992`, `rs5219`, `rs1801282`, `rs4402960`
- `coronary artery disease` / `cad` -> `rs1333049`, `rs4977574`, `rs9349379`, `rs6725887`, `rs1746048`, `rs3184504`
- `body mass index` / `bmi` -> `rs9939609`, `rs17782313`, `rs6548238`, `rs10938397`, `rs7498665`, `rs7138803`
- `asthma` -> `rs7216389`, `rs2305480`, `rs9273349`
- `rheumatoid arthritis` -> `rs2476601`, `rs3761847`, `rs660895`
- `alzheimer disease` -> `rs429358`, `rs7412`, `rs6733839`, `rs11136000`, `rs3851179`
- `ldl cholesterol` / `total cholesterol` -> `rs7412`, `rs429358`, `rs6511720`, `rs629301`, `rs12740374`, `rs11591147`

## Autonomous Execution Contract (Embedded Behavior)

When a user asks for locus-to-gene mapping and gives only a trait (for example, `type 2 diabetes`), do the following automatically:

1. Run the bundled script with `--trait-query "<user_trait>" --print-result` (no manual JSON required).
2. If it returns `No anchors remained`, rerun once with a built-in default seed rsID for that trait (unless `disable_default_seeds=true`).
3. Read the generated `mapping_output_path` and `summary_output_path`.
4. Return this concise response structure:
   - `Top 5 cross-locus prioritized genes`
   - `Per-locus top gene (score, confidence)`
   - `Visualization artifact` (figure path(s) or Mermaid fallback block)
   - `Warnings and limitations`
5. For inline image rendering in chat:
   - read `inline_image_markdown` from script result
   - emit those lines exactly as plain markdown (no code fences)
   - if inline rendering still fails, instruct user to upload PNG files into the chat

Do not ask the user to run python manually unless execution is actually blocked.

## Skill Chaining Order (Mandatory)

Use these skills in order. Skip only when an earlier step is not needed by provided inputs.

1. `efo-ontology-skill`
   - Resolve `trait_query` to canonical EFO term and synonyms.
   - Expand descendants when `show_child_traits=true`.
2. `gwas-catalog-skill`
   - Discover anchor variants for the trait/EFO scope.
   - Pull association/study metadata for locus context.
3. Built-in NCBI RefSNP coordinate resolution
   - Normalize each anchor rsID to GRCh37/GRCh38 top-level chromosome placements.
4. `opentargets-skill`
   - Retrieve credible set context, L2G predictions, and colocalisation evidence per locus.
5. `gtex-eqtl-skill`
   - Retrieve single-tissue eQTL support for anchor variants.
6. `genebass-gene-burden-skill`
   - Retrieve rare-variant burden support for candidate genes.
7. `clinvar-variation-skill` (when `include_clinvar=true`)
   - Add variant clinical/coding annotations.
8. `gnomad-graphql-skill` (when `include_gnomad_context=true`)
   - Add frequency and gene-level constraint context.
9. `human-protein-atlas-skill` (when `include_hpa_tissue_context=true`)
   - Add tissue plausibility context for top genes.

Never perform additional retrieval after final candidate-gene scoring starts.

## Output Contract (Required)

Always return:

1. `locus_to_gene_mapping.json`
2. `locus_to_gene_summary.md`

### JSON contract

```json
{
  "meta": {
    "trait_query": "...",
    "efo_id": "EFO_...",
    "generated_at": "ISO-8601",
    "sources_queried": []
  },
  "anchors": [
    {
      "rsid": "rs...",
      "grch38": {"chr": "3", "pos": 49629531, "ref": "A", "alt": "C"},
      "lead_trait": "...",
      "p_value": 2e-11,
      "cohort": "..."
    }
  ],
  "loci": [
    {
      "locus_id": "chr3:49000000-50200000",
      "lead_rsid": "rs...",
      "candidate_genes": [
        {
          "symbol": "MST1",
          "ensembl_id": "ENSG...",
          "overall_score": 0.71,
          "confidence": "High|Medium|Low|VeryLow",
          "evidence": {
            "l2g_max": 0.83,
            "coloc_max_h4": 0.84,
            "eqtl_tissues": ["Lung"],
            "rare_variant_support": "none|nominal|strong",
            "coding_support": "none|noncoding|coding",
            "clinvar_support": "none|present",
            "gnomad_context": "...",
            "hpa_tissue_support": ["lung"]
          },
          "rationale": [
            "..."
          ],
          "limitations": [
            "..."
          ]
        }
      ]
    }
  ],
  "cross_locus_ranked_genes": [
    {
      "symbol": "...",
      "supporting_loci": 3,
      "mean_score": 0.62,
      "max_score": 0.81
    }
  ],
  "warnings": [],
  "limitations": []
}
```

### Markdown summary contract

The summary must include sections in this exact order:

1. `Objective`
2. `Inputs and scope`
3. `Anchor variant summary`
4. `Per-locus top genes`
5. `Cross-locus prioritized genes`
6. `Key caveats`
7. `Recommended next analyses`

## Optional Figure Contract

Only produce figures when `include_figures=true`.

If figures are generated, append this block to JSON:

```json
{
  "figures": [
    {
      "id": "locus_gene_heatmap",
      "path": "./output/figures/locus_gene_heatmap.png",
      "caption": "Top candidate genes by evidence component across loci"
    }
  ]
}
```

Recommended figure set:

1. `locus_gene_heatmap.png`
   - Rows: top genes, columns: evidence components (`L2G`, `coloc`, `eQTL`, `burden`, `coding`).
2. `locus_score_decomposition.png`
   - Stacked bars per locus for top 3 genes.
3. `tissue_support_dotplot.png`
   - Gene-by-tissue evidence dots from GTEx/HPA context.

If plotting dependencies are unavailable, skip PNG generation and output Mermaid diagrams in markdown as fallback.
The script also returns `inline_image_markdown` and `render_instructions` fields to support inline chat rendering.

## Scoring Rules (Deterministic)

For each candidate gene per locus, compute:

- `l2g_component`: max L2G score for the gene in locus (`0..1`)
- `coloc_component`: max `h4` (or `clpp` when only CLPP is available), clipped to `0..1`
- `eqtl_component`: `min(1, relevant_tissue_hits / 3)`
- `burden_component`:
  - `1.0` if burden `p < 2.5e-6`
  - `0.6` if `2.5e-6 <= p < 0.05`
  - `0.0` otherwise
- `coding_component`:
  - `1.0` for coding consequence in target gene with supportive ClinVar annotation
  - `0.6` for coding consequence in target gene without supportive ClinVar annotation
  - `0.3` for noncoding-in-gene support only
  - `0.0` otherwise

Overall score:

`overall_score = 0.40*l2g + 0.25*coloc + 0.15*eqtl + 0.10*burden + 0.10*coding`

Confidence label:

- `High` if score `>= 0.75`
- `Medium` if `0.55 <= score < 0.75`
- `Low` if `0.35 <= score < 0.55`
- `VeryLow` if score `< 0.35`

## Pipeline Contract

### Phase 0: Validate and normalize input

- Enforce that at least one of `trait_query`, `efo_id`, `seed_rsids` is present.
- Normalize rsID formatting and deduplicate seed variants.
- Resolve free-text trait to one canonical EFO term when needed.

### Phase 1: Build anchor set

- If trait/EFO input is provided, pull associations and rank anchors by p-value and effect availability.
- Merge trait-derived anchors with user-supplied `seed_rsids`.
- Cap anchors using `max_loci` and log dropped anchors in `warnings`.

### Phase 2: Gather locus-to-gene evidence

- Normalize anchor coordinates (both builds when possible).
- Pull Open Targets locus evidence (credible set/L2G/coloc).
- Pull GTEx variant-level eQTL rows.
- Pull gene-level burden results for mapped candidate genes.
- Pull ClinVar and gnomAD context when enabled.

### Phase 3: Harmonize and score

- Build a per-locus candidate-gene table.
- Compute deterministic component scores and overall score.
- Create cross-locus aggregate rankings.

### Phase 4: Synthesize outputs

- Write JSON mapping file.
- Write markdown summary in exact section order.
- Optionally generate figures and append `figures` metadata.

### Phase 5: QC gates

Fail the run when any of the following occurs:

- No anchors after normalization.
- Unresolved GRCh38 coordinates should be surfaced as `status=degraded`, not treated as an analytically clean pass.
- Any locus has candidate genes without score fields.
- `overall_score` outside `0..1`.
- Summary section order mismatch.
- Claim of causality without explicit evidence support in rationale text.

## Public Interface

```python
def map_locus_to_gene(input_json: dict) -> dict:
    ...
```

Return:

```json
{
  "status": "ok",
  "mapping_output_path": "./output/locus_to_gene_mapping.json",
  "summary_output_path": "./output/locus_to_gene_summary.md",
  "figure_paths": [],
  "warnings": [],
  "limitations": []
}
```

## Non-Invention Rules

- Never invent rsIDs, p-values, scores, cohort labels, tissues, or gene links.
- Never silently impute missing evidence as positive support.
- When evidence is missing, record it as a limitation and reduce confidence.
- Keep evidence provenance explicit (`source skill` + endpoint family) in rationale lines.

## Non-Goals

- Do not claim definitive causal genes from association evidence alone.
- Do not run fine-mapping methods not directly provided by upstream sources.
- Do not collapse multiple independent signals into one without stating assumptions.
