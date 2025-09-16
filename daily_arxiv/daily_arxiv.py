#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ArXiv New Fetcher — 单文件可执行脚本（本地与 GitHub Runner 皆可用）

热修复（2025-08-06 01:10 SGT）
- **根因 A**：不同分类页面存在两种结构：
  1) 每个小节（New / Cross / Replacement）各在 **独立的 `<dl>`** 中；
  2) 三个小节共用 **同一个 `<dl>`**，由多个 `<h3>` 分段。旧写法直接 `./dt` 会把整段所有 `dt` 一把抓或抓不到。
- **根因 B**：小节标题文案存在变体：`Cross lists / Cross-lists / Cross submissions`、`Replacement / Replacements / Replacement submissions`。
- **修复**：
  1) 统一以 **`<dl>` 为外层容器遍历**；若一个 `<dl>` 含有多个 `<h3>`，则对 **每个 `<h3>`** 向后逐个同级兄弟扫描 `dt`，**在遇到下一个 `<h3>` 时停止**，从而保证只取当前小节的条目。
  2) 小节识别的正则更宽松，兼容上述变体；
  3) 日志增强，便于核对“标题显示的条数 vs 实际解析到的 `dt` 数”。

字段 & 输出：
- 与你的约定保持一致：`primary_category`/`cate` 输出 **代码**（如 `cs.CR`）；`url/pdf_url` 使用 **http**，`new` 段默认补 `v1`；不追加`.pdf`；
- `include_cross` / `include_repl` 支持 **程序常量 / 环境变量 / CLI** 三层控制（优先级：CLI > ENV > 常量）。

依赖：
  pip install scrapy arxiv tqdm pydispatcher

用法：
  本地：  python scripts/arxiv_new_fetch.py               # 输出到 ./arxiv_new_YYYYMMDD.jsonl
  本地：  CATEGORIES="cs.AI,cs.CL" python scripts/arxiv_new_fetch.py --out today.jsonl
  Runner：python scripts/arxiv_new_fetch.py            # 若设置了 RAW_JSONL_FILE/TARGET_DATE，会按其输出
"""

from __future__ import annotations
import os
import re
import sys
import json
import time
import argparse
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple

import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy import signals
from pydispatch import dispatcher

try:
    import arxiv  # 用于批量富化
    HAVE_ARXIV = True
except Exception:
    HAVE_ARXIV = False

try:
    from tqdm import tqdm
except Exception:
    # 兼容无 tqdm 环境
    def tqdm(x, **_):
        return x

# ─────────────── 默认配置（可被 程序常量 / 环境变量 / CLI 覆盖） ───────────────
DEFAULT_CATEGORIES: List[str] = [
    "cs.AI","cs.AR","cs.CC","cs.CE","cs.CG","cs.CL","cs.CR","cs.CV","cs.CY","cs.DB",
    "cs.DC","cs.DL","cs.DM","cs.DS","cs.ET","cs.FL","cs.GL","cs.GR","cs.GT","cs.HC",
    "cs.IR","cs.IT","cs.LG","cs.LO","cs.MA","cs.MM","cs.MS","cs.NA","cs.NE","cs.NI",
    "cs.OH","cs.OS","cs.PF","cs.PL","cs.RO","cs.SC","cs.SD","cs.SE","cs.SI","cs.SY",
    "eess.AS","eess.IV","eess.SP","eess.SY","math.NA","stat.AP","q-fin.MF",
]

# 👉 便于验证 cross/repl，默认先 **打开**（你也可通过 ENV/CLI 改成关闭）
DEFAULT_INCLUDE_CROSS: bool = True
DEFAULT_INCLUDE_REPL:  bool = True

SGT = timezone(timedelta(hours=8))  # 新加坡时区（用于默认输出文件名）

# 环境变量辅助（支持多名）
def env_bool_multi(names, default: bool) -> bool:
    if isinstance(names, str):
        names = [names]
    hit = None
    for name in names:
        v = os.getenv(name)
        if v is None:
            continue
        val = str(v).strip().lower() in ("1","true","t","yes","y")
        hit = val
        break
    return default if hit is None else hit

# ─────────────── Spider 定义 ───────────────
class ArxivNewSpider(scrapy.Spider):
    name = "arxiv_new"
    allowed_domains = ["arxiv.org"]

    RE_CATEGORIES = re.compile(r"\(([a-z\-]+(?:\.[A-Za-z0-9\-]+)?)\)")
    RE_ID_FROM_ABS = re.compile(r"/abs/(.+)$")
    RE_STRIP_VER = re.compile(r"v\d+$")

    # 段落识别正则（忽略大小写，兼容列表/提交多文案）
    PAT_NEW   = re.compile(r"\bnew\s+submissions\b", re.I)
    PAT_CROSS = re.compile(r"\bcross\b.*\b(lists?|submissions?)\b", re.I)
    PAT_REPL  = re.compile(r"\breplacement(s)?\b(?:.*\bsubmissions?\b)?", re.I)

    BASE_SETTINGS = dict(
        ROBOTSTXT_OBEY=True,
        USER_AGENT="InsightArxivBot/1.0 (+contact)",
        CONCURRENT_REQUESTS=12,
        CONCURRENT_REQUESTS_PER_DOMAIN=12,
        DOWNLOAD_TIMEOUT=20,
        RETRY_TIMES=2,
        AUTOTHROTTLE_ENABLED=True,
        AUTOTHROTTLE_START_DELAY=0.25,
        AUTOTHROTTLE_MAX_DELAY=2.0,
        RANDOMIZE_DOWNLOAD_DELAY=True,
        HTTPCACHE_ENABLED=False, # 默认关闭缓存（可开启）
        HTTPCACHE_EXPIRATION_SECS=1800,
        HTTPCACHE_DIR="httpcache",
        ITEM_PIPELINES={},
        # "LOG_LEVEL": "INFO",
    )

    def __init__(self, *, categories: List[str], window: str, show: int,
                 include_cross: bool, include_repl: bool):
        super().__init__()
        self.categories = categories
        self.window = window
        self.show = show
        self.include_cross = include_cross
        self.include_repl = include_repl
        self.start_urls = [f"https://arxiv.org/list/{c}/{self.window}?show={self.show}" for c in self.categories]
        self.seen_ids = set()  # 跨分类去重（按无版本 id）
        self.logger.info(
            f"[init] cats={len(self.categories)} window={self.window} show={self.show} "
            f"include_cross={self.include_cross} include_repl={self.include_repl}"
        )

    # 工具：安全取文本（保留基本空格，但压缩多空格）
    def _text(self, sel, css: str) -> str:
        if not sel:
            return ""
        t = " ".join(sel.css(css + " ::text").getall()).replace("\n", " ")
        while "  " in t:
            t = t.replace("  ", " ")
        return t.strip()

    def _sec_flag_from_title(self, title: str) -> str | None:
        low = " ".join(title.split()).lower()
        if self.PAT_NEW.search(low):
            return "new"
        if self.PAT_CROSS.search(low):
            return "cross"
        if self.PAT_REPL.search(low):
            return "repl"
        return None

    def _iter_dt_dd_between_h3(self, h3) -> List[Tuple[scrapy.Selector, scrapy.Selector | None]]:
        """从当前 `<h3>` 起向后扫描同级兄弟，收集直到下一个 `<h3>`，返回 (dt, dd) 列表。"""
        out: List[Tuple[scrapy.Selector, scrapy.Selector | None]] = []
        for sib in h3.xpath("following-sibling::*"):
            name = sib.xpath("name()").get("")
            if not name:
                continue
            name = name.lower()
            if name == "h3":
                break
            if name == "dt":
                dd = sib.xpath("following-sibling::*[1][self::dd]")
                out.append((sib, dd[0] if dd else None))
        return out

    def parse(self, response):
        cat = response.url.split("/")[-2]
        self.logger.info(f"[parse] {cat}: {response.url}")

        total_yield = 0

        # 遍历所有 <dl> 容器；兼容：一个 dl 只有一个 h3，或一个 dl 有多个 h3
        for dl in response.xpath("//div[@id='dlpage']//dl"):
            h3_nodes = dl.xpath("./h3")
            if not h3_nodes:
                continue

            # 情况一：一个 dl 只有一个 h3，直接 ./dt 取该小节条目
            if len(h3_nodes) == 1:
                h3 = h3_nodes[0]
                title = " ".join(h3.xpath(".//text()").getall()).strip()
                sec_flag = self._sec_flag_from_title(title)
                if not sec_flag:
                    continue
                if sec_flag == "cross" and not self.include_cross:
                    continue
                if sec_flag == "repl" and not self.include_repl:
                    continue
                dt_list = dl.xpath("./dt")
                self.logger.info(f"  section={sec_flag} dt_nodes={len(dt_list)} title='{title}'")
                for dt in dt_list:
                    dd = dt.xpath("following-sibling::dd[1]")
                    dd = dd[0] if dd else None
                    item = self._build_item_from_dt_dd(dt, dd, sec_flag)
                    if item is not None:
                        total_yield += 1
                        yield item
            else:
                # 情况二：一个 dl 含多个 h3，小节间同级分隔；对每个 h3 向后扫到下一个 h3
                for h3 in h3_nodes:
                    title = " ".join(h3.xpath(".//text()").getall()).strip()
                    sec_flag = self._sec_flag_from_title(title)
                    if not sec_flag:
                        continue
                    if sec_flag == "cross" and not self.include_cross:
                        continue
                    if sec_flag == "repl" and not self.include_repl:
                        continue
                    pairs = self._iter_dt_dd_between_h3(h3)
                    self.logger.info(f"  section={sec_flag} dt_nodes={len(pairs)} title='{title}'")
                    for dt, dd in pairs:
                        item = self._build_item_from_dt_dd(dt, dd, sec_flag)
                        if item is not None:
                            total_yield += 1
                            yield item

        self.logger.info(f"  yielded={total_yield}")

    # 将一个 (dt, dd) 节点解析为 item；失败返回 None
    def _build_item_from_dt_dd(self, dt: scrapy.Selector, dd: scrapy.Selector | None, sec_flag: str):
        # 1) abs 链接
        abs_href = dt.xpath(".//a[contains(@href, '/abs/')]/@href").get()
        if not abs_href:
            return None
        m = self.RE_ID_FROM_ABS.search(abs_href)
        if not m:
            return None
        full_id = m.group(1)                          # 2508.00906 或 2508.00906v1
        base_id = self.RE_STRIP_VER.sub("", full_id)  # 去版本：2508.00906
        if base_id in self.seen_ids:
            return None
        self.seen_ids.add(base_id)

        # 2) 标题 / 作者
        title_txt = (self._text(dd, ".list-title").replace("Title:", "").strip() if dd is not None else "")
        authors = (dd.css(".list-authors a::text").getall() if dd is not None else [])

        # 3) 分类：所有代码 + 主类代码
        subjects_text_for_codes = self._text(dd, ".list-subjects") if dd is not None else ""
        all_cats = sorted(set(self.RE_CATEGORIES.findall(subjects_text_for_codes)))
        primary_code = ""
        if dd is not None:
            primary_block = self._text(dd, ".list-subjects .primary-subject")
            m2 = self.RE_CATEGORIES.search(primary_block)
            if m2:
                primary_code = m2.group(1)
        if not primary_code and all_cats:
            primary_code = all_cats[0]

        # 4) 版本化链接
        if "v" in full_id:
            versioned = full_id
        elif sec_flag == "new":
            versioned = base_id + "v1"
        else:
            versioned = base_id

        abs_url = f"http://arxiv.org/abs/{versioned}"
        pdf_url = f"http://arxiv.org/pdf/{versioned}"

        return {
            "id": base_id,
            "title": title_txt,
            "authors": authors,
            "categories": all_cats,
            "primary_category": primary_code,   # 代码，如 cs.CR
            "pdf_link": None,
            "comments": "",
            "url": abs_url,
            "summary": "",
            "comment": None,
            "pdf_url": pdf_url,
            "cate": primary_code,
            "date": None,
            "updated": None,
            "section": sec_flag,
        }

# ─────────────── 批量元数据补齐（按批 200 条） ───────────────
def enrich_with_arxiv_api(rows: List[Dict], batch_size: int, delay_sec: float, retries: int) -> List[Dict]:
    """使用 arXiv 官方 API 批量补齐摘要、评论、时间等；失败不中断。"""
    if not rows or not HAVE_ARXIV:
        return rows

    client = arxiv.Client(page_size=batch_size, delay_seconds=delay_sec, num_retries=retries)

    ids = [r["id"] for r in rows if r.get("id")]

    def chunked(seq, n):
        for i in range(0, len(seq), n):
            yield seq[i:i+n]

    meta: Dict[str, Dict] = {}
    for chunk in tqdm(list(chunked(ids, batch_size)), desc="arXiv API", unit="batch"):
        results = []
        for attempt in range(retries):
            try:
                search = arxiv.Search(id_list=chunk)
                results = list(client.results(search))
                break
            except Exception:
                if attempt == retries - 1:
                    results = []
                else:
                    time.sleep(2)
        for r in results:
            rid = getattr(r, "get_short_id", lambda: None)() or r.entry_id.split("/")[-1]
            rid = re.sub(r"v\d+$", "", rid)
            authors = [getattr(a, "name", str(a)) for a in (getattr(r, "authors", None) or [])]
            cats = []
            if getattr(r, "categories", None):
                cats = sorted({str(c) for c in r.categories})
            primary = ""
            if getattr(r, "primary_category", None):
                primary = str(r.primary_category)
            meta[rid] = {
                "title": (getattr(r, "title", "") or "").strip(),
                "authors": authors,
                "abstract": getattr(r, "summary", None),
                "comment": getattr(r, "comment", None) or None,
                "categories": cats,
                "primary_category": primary,
                "abs_url": f"http://arxiv.org/abs/{r.entry_id.split('/')[-1]}",
                "pdf_url": f"http://arxiv.org/pdf/{r.entry_id.split('/')[-1]}",
                "published_at": getattr(r, "published", None).date().isoformat() if getattr(r, "published", None) else None,
                "updated_at": getattr(r, "updated", None).date().isoformat() if getattr(r, "updated", None) else None,
            }
        time.sleep(delay_sec)

    out: List[Dict] = []
    for row in rows:
        iid = row.get("id")
        add = meta.get(iid, {})
        merged = dict(row)
        # 仅在缺失时补基础字段
        for k, v in (
            ("title", add.get("title")),
            ("authors", add.get("authors")),
            ("categories", add.get("categories")),
            ("pdf_url", add.get("pdf_url")),
        ):
            if not merged.get(k) and v:
                merged[k] = v
        # 摘要/日期：按你的示例写入
        if add.get("abstract") is not None:
            merged["summary"] = add["abstract"] or ""
        if add.get("published_at"):
            merged["date"] = add["published_at"]  # YYYY-MM-DD
        if add.get("updated_at"):
            merged["updated"] = add["updated_at"]
        # 新增：写入 comment（并同步到 comments 以兼容旧字段）
        if add.get("comment") is not None:
            merged["comment"] = add["comment"] or ""
            merged["comments"] = merged["comment"]
        out.append(merged)
    return out

# ─────────────── 工具：写 JSONL（原子替换） ───────────────
def write_jsonl(rows: List[Dict], path: str):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    os.replace(tmp, path)

# ─────────────── CLI 与主流程 ───────────────

def parse_args():
    # 输出优先：OUT_PATH > RAW_JSONL_FILE > TARGET_DATE 推导 > ./arxiv_new_YYYYMMDD.jsonl
    env_out = os.getenv("OUT_PATH") or os.getenv("RAW_JSONL_FILE")
    if not env_out and os.getenv("TARGET_DATE"):
        env_out = f"data/{os.environ['TARGET_DATE']}.jsonl"

    env_categories = os.getenv("CATEGORIES")
    env_window = os.getenv("WINDOW")
    env_show = os.getenv("SHOW")

    # include_cross / include_repl 默认使用程序常量，可被 ENV/CLI 覆盖
    include_cross_default = env_bool_multi(["INCLUDE_CROSS", "include_cross"], DEFAULT_INCLUDE_CROSS)
    include_repl_default  = env_bool_multi(["INCLUDE_REPL", "include_repl"], DEFAULT_INCLUDE_REPL)

    p = argparse.ArgumentParser(description="Fetch arXiv /new for multiple categories and output JSONL.")
    p.add_argument("--out", default=env_out or os.path.join(".", f"arxiv_new_{datetime.now(SGT).strftime('%Y%m%d')}.jsonl"),
                   help="输出 JSONL 路径（默认当前目录）；若设置 RAW_JSONL_FILE/TARGET_DATE 会自动匹配 Actions 命名")
    p.add_argument("--categories", default=env_categories or ",".join(DEFAULT_CATEGORIES),
                   help="逗号分隔的分类列表（ENV:CATEGORIES 可覆盖）")
    p.add_argument("--window", choices=["new","recent","pastweek"], default=(env_window or "new"),
                   help="列表窗口（默认 new；ENV:WINDOW 可覆盖）")
    p.add_argument("--show", type=int, default=int(env_show or 2000),
                   help="每页展示条数（默认 2000；ENV:SHOW 可覆盖）")

    # 段落开关（默认打开以便验证；可用 程序常量 / ENV / CLI 调整）
    p.add_argument("--include-cross", action="store_true", default=include_cross_default, help="包含 Cross-lists / Cross submissions")
    p.add_argument("--include-repl", action="store_true", default=include_repl_default, help="包含 Replacements / Replacement submissions")

    # Scrapy 调优
    p.add_argument("--concurrent-req", type=int, default=int(os.getenv("CONCURRENT_REQUESTS", 12)))
    p.add_argument("--concurrent-per-domain", type=int, default=int(os.getenv("CR_PER_DOMAIN", 12)))
    p.add_argument("--download-timeout", type=int, default=int(os.getenv("DOWNLOAD_TIMEOUT", 20)))
    p.add_argument("--retry-times", type=int, default=int(os.getenv("RETRY_TIMES", 2)))
    p.add_argument("--at-start", type=float, default=float(os.getenv("AT_START", 0.25)))
    p.add_argument("--at-max", type=float, default=float(os.getenv("AT_MAX", 2.0)))
    p.add_argument("--httpcache-ttl", type=int, default=int(os.getenv("CACHE_TTL", 1800)))
    p.add_argument("--log-level", default=os.getenv("LOG_LEVEL", "INFO"))

    # 元数据富化（默认 True）
    p.add_argument("--enrich", dest="enrich", action="store_true", help="抓取后使用 arXiv API 批量补齐元数据")
    p.add_argument("--no-enrich", dest="enrich", action="store_false", help="不做元数据补齐（更快）")
    p.set_defaults(enrich=env_bool_multi(["ENRICH", "enrich"], True))

    p.add_argument("--batch-size", type=int, default=int(os.getenv("ARXIV_BATCH_SIZE", 200)), help="arXiv API 每批条数")
    p.add_argument("--delay-sec", type=float, default=float(os.getenv("ARXIV_DELAY_SEC", 3.0)), help="批间隔秒")
    p.add_argument("--retries", type=int, default=int(os.getenv("ARXIV_RETRIES", 5)), help="API 重试次数")

    return p.parse_args()


def main():
    args = parse_args()

    categories = [c.strip() for c in args.categories.split(",") if c.strip()]

    # 将 CLI 覆盖到 Scrapy 设置（确保 CLI 生效）
    settings = dict(ArxivNewSpider.BASE_SETTINGS)
    settings.update(dict(
        CONCURRENT_REQUESTS=args.concurrent_req,
        CONCURRENT_REQUESTS_PER_DOMAIN=args.concurrent_per_domain,
        DOWNLOAD_TIMEOUT=args.download_timeout,
        RETRY_TIMES=args.retry_times,
        AUTOTHROTTLE_START_DELAY=args.at_start,
        AUTOTHROTTLE_MAX_DELAY=args.at_max,
        HTTPCACHE_EXPIRATION_SECS=args.httpcache_ttl,
        LOG_LEVEL=args.log_level,
    ))

    collected: List[Dict] = []

    def _collect_item(item, response, spider):
        try:
            collected.append(dict(item))
        except Exception:
            pass

    dispatcher.connect(_collect_item, signal=signals.item_scraped)

    process = CrawlerProcess(settings=settings)
    process.crawl(ArxivNewSpider,
                  categories=categories,
                  window=args.window,
                  show=args.show,
                  include_cross=args.include_cross,
                  include_repl=args.include_repl)

    try:
        process.start()  # 阻塞直到爬完
    except Exception as e:
        print(f"❌ Scrapy 运行失败：{e}", file=sys.stderr)
        sys.exit(2)

    rows = collected
    if args.enrich:
        if not HAVE_ARXIV:
            print("⚠️ 未安装 arxiv 库，跳过富化（pip install arxiv）")
        else:
            rows = enrich_with_arxiv_api(collected, args.batch_size, args.delay_sec, args.retries)

    write_jsonl(rows, args.out)
    print(f"\n✅ 完成：{len(rows)} 条，输出文件：{args.out}")


if __name__ == "__main__":
    main()
