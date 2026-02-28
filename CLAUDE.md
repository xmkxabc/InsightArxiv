# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InsightArxiv is a fully automated pipeline that fetches arXiv papers, enriches them with AI analysis (Google Gemini or OpenAI-compatible APIs), generates Markdown reports, and publishes to GitHub Pages.

## Pipeline Commands

Run the full pipeline (in order):

```bash
# Step 1: Crawl papers
cd daily_arxiv
scrapy crawl arxiv -o ../data/$(date -u +%Y-%m-%d).jsonl

# Step 2: AI enhancement
cd ../ai
python enhance.py --data ../data/YYYY-MM-DD.jsonl --language Chinese

# Step 3: Generate Markdown report
cd ../to_md
python convert.py \
  --input ../data/YYYY-MM-DD_AI_enhanced_Chinese.jsonl \
  --template paper_template.md \
  --output ../data/YYYY-MM-DD.md

# Step 4: Update README
cd ..
python update_readme.py

# Step 5: Build search database (for website)
python build_database.py
```

Or run the full pipeline with:
```bash
bash run.sh
```

## Environment Variables

Create `ai/.env` with:
```
GOOGLE_API_KEYS=key1,key2,key3
MODEL_PRIORITY_LIST=gemini-2.5-flash,gemini-flash-latest,gemini-1.5-flash
```

Third-party OpenAI-compatible API (optional, takes priority over Google):
```
OPENAI_API_KEYS=sk-xxx,sk-yyy        # comma-separated, one per provider
OPENAI_BASE_URLS=https://api.deepseek.com,https://openrouter.ai/api/v1
OPENAI_MODELS=deepseek-chat,deepseek/deepseek-chat
OPENAI_RPMS=60,60                    # requests per minute per key
OPENAI_RPDS=0,0                      # requests per day (0 = unlimited)
```

If both Google and OpenAI keys are set, OpenAI is tried first; Google is the fallback.
If only one provider is configured, the other is skipped entirely.

For crawling and report generation, set:
```
CATEGORIES=cs.AI,cs.CL,cs.LG   # controls both crawl targets and report sort order
LANGUAGE=Chinese                 # AI output language (default: Chinese)
```

## Architecture

### Data Flow
```
arxiv.org → [Scrapy spider] → data/YYYY-MM-DD.jsonl
                                       ↓
                          [Gemini AI enhancement]
                                       ↓
             data/YYYY-MM-DD_AI_enhanced_Chinese.jsonl
                                       ↓
                         [Markdown report generator]
                                       ↓
                             data/YYYY-MM-DD.md
                                       ↓
                           [README updater + DB builder]
                                       ↓
                    README.md + docs/data/*.json (website)
```

### Key Files

| File | Purpose |
|------|---------|
| `daily_arxiv/daily_arxiv.py` | Single-file Scrapy spider. Scrapes arXiv `/list/{category}/new`, enriches with official arXiv API. Handles both `<dl>` structures arXiv uses. |
| `ai/enhance.py` | Async AI enrichment. Supports OpenAI-compatible APIs (primary) and Google Gemini (fallback). Manages multi-key + multi-model rotation with `ComboLimiter` (rate limiting per key/model combo). Concurrency = total number of API keys across all providers. |
| `ai/structure.py` | Pydantic model defining AI output fields: `title_translation`, `tldr`, `motivation`, `method`, `result`, `conclusion`, `translation`, `summary`, `keywords`, `comments`. |
| `ai/system.txt` | System prompt for Gemini. |
| `ai/template.txt` | Human prompt template (`{title}`, `{content}`, `{language}`). |
| `to_md/convert.py` | Reads AI-enhanced JSONL, renders per-paper template, generates categorized Markdown with TOC. Category sort order controlled by `CATEGORIES` env var. |
| `to_md/paper_template.md` | Per-paper Markdown template with placeholders like `{title}`, `{tldr}`, `{ai_comment}`, `{results}`, `{ai_Abstract}`, `{abstract_translation}`. |
| `build_database.py` | Builds chunked search index and monthly JSON shards for the website. Uses multiprocessing + jieba/NLTK tokenization. Reads `data/*_AI_enhanced_Chinese.jsonl`. |
| `update_readme.py` | Generates README.md from `readme_content_template.md`, with dashboard, calendar heatmap, and archive sections. |
| `docs/` | GitHub Pages website (vanilla JS SPA). `app.js` is the main app; `json-parser-worker.js` is a Web Worker for data loading. |

### `ai/enhance.py` Key Design

- **Provider priority**: OpenAI-compatible combos are initialized first and tried before Google Gemini combos.
- **Rate limiting**: `ComboLimiter` enforces per-combo RPM/RPD limits; each (key, model) pair has its own limiter.
- **Fallback strategy**: Each paper first tries its `preferred_key` across all its models, then falls back to all other key/model combos across all providers.
- **Dynamic cooldown**: After each API call, the key is returned to the queue after `60/RPM` seconds (cooldown runs as a background task, not blocking).
- **HTTP 429 handling**: Rate-limit errors from OpenAI-compatible APIs are caught and retried with backoff (without marking quota as exhausted).
- **Google quotas** (hardcoded in `FREE` dict): `gemini-2.5-flash` = 10 RPM/250 RPD; `gemini-flash-lite-latest` = 15 RPM/1000 RPD; etc.
- **OpenAI quotas**: Configured via `OPENAI_RPMS` / `OPENAI_RPDS` env vars (default: 60 RPM, unlimited RPD).

### `build_database.py` Output (→ `docs/data/`)

- `index.json` — manifest of available months and total paper count
- `database-YYYY-MM.json` — monthly paper shards
- `search_index_{key}.json` — chunked inverted index (keyed by first char: a-z, 0, zh_0–zh_9)
- `search_index_manifest.json` — chunk manifest
- `category_index.json` — category → paper ID list

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `run.yml` | Scheduled | Full pipeline (crawl → enhance → report → README) |
| `buildDatabase.yml` | After run.yml | Rebuilds search database |
| `enhanceYML` | Manual | Re-run AI enhancement only |
| `bulk_repair.yml` | Manual | Re-enhance all historical ERROR records (newest-first, configurable glob) |
| `deployGitHubPages.yml` | Push to main | Deploy `docs/` to GitHub Pages |

## Development Notes

- **Python version**: ≥ 3.12, managed via `uv` (`uv.lock` present).
- **Install deps**: `uv pip install -r requirements.txt` or `pip install -r requirements.txt`
- **Re-enhance errors**: Use `ai/re_enhance_errors.py` to retry papers that got `ERROR` in AI fields.
  - Single file: `python ai/re_enhance_errors.py --data data/2026-02-25_AI_enhanced_Chinese.jsonl`
  - Batch (PowerShell): set env vars inline then run with `--glob`:
    ```powershell
    $env:OPENAI_API_KEYS="sk-xxx"; $env:OPENAI_BASE_URLS="https://api.deepseek.com"; $env:OPENAI_MODELS="deepseek-chat"; $env:OPENAI_RPMS="60"; $env:OPENAI_RPDS="0"
    python ai/re_enhance_errors.py --glob "data/*_AI_enhanced_Chinese.jsonl"
    ```
  - Batch (cmd): use `set VAR=value` before the command.
- **Spider is a single file** (`daily_arxiv/daily_arxiv.py`), not a standard Scrapy project directory — run it directly with `scrapy crawl arxiv` from inside `daily_arxiv/`.
- **Template placeholders** in `to_md/paper_template.md` use `{key}` syntax (Python str.replace, not f-strings). The field mapping between `structure.py` fields and template keys is in `convert.py:context` dict — `ai_comment` maps to `Structure.comments`, `results` maps to `Structure.result`, `ai_Abstract` maps to `Structure.summary`.
- **`build_database.py` reads only** `*_AI_enhanced_Chinese.jsonl` files. If you change the `--language` argument in enhance, update the glob pattern accordingly.
