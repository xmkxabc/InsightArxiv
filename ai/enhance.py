#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enhance_arxiv.py — 并发 + 进度条 + 模型与 Key 编号显示 + 使用统计 + 健壮性防御
"""

import os, sys, json, time, argparse, asyncio
from typing import Dict, Tuple, Any, List, Optional
from collections import Counter

import dotenv
from tqdm import tqdm
from google.api_core import exceptions as gexc
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from structure import Structure

# ───────── 1 · 自定义 LLM ──────────
def _no_retry(f): return f

class ChatGoogleNoRetry(ChatGoogleGenerativeAI):
    def __init__(self, *a, **kw):
        req = dict(kw.pop("request_options", {}) or {}); req["retry"] = False
        super().__init__(*a, request_options=req, **kw)
        if hasattr(self, "_retry_decorator"):        self._retry_decorator = _no_retry
        if hasattr(self, "_async_retry_decorator"):  self._async_retry_decorator = _no_retry

# ───────── 2 · 免费额度表 ──────────
FREE = {
    "gemini-2.5-flash":   (10, 250),
    "gemini-2.5-pro":     (5, 100),
    "gemini-2.5-flash-l": (15, 1000),
    "gemini-2.0-flash":   (15, 200),
    "gemini-2.0-flash-l": (30, 200),
    "gemini-1.5-flash":   (15, 50),
    "gemini-1.5-pro":     (2, 50),
}
quota = lambda m: next((v for p, v in FREE.items() if m.startswith(p)), (10, 250))

# ───────── 3 · CLI & ENV ──────────
def cli():
    ap = argparse.ArgumentParser(description="Enhance arXiv JSONL with Gemini")
    ap.add_argument("--data", required=True)
    ap.add_argument("--language", default="Chinese")
    ap.add_argument("--retries", type=int, default=3)
    ap.add_argument("--concurrency", type=int, default=10)
    return ap.parse_args()

dotenv.load_dotenv()
API_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()]
MODELS   = [m.strip() for m in os.getenv("MODEL_PRIORITY_LIST", "").split(",") if m.strip()]
if not API_KEYS or not MODELS:
    sys.exit("❌ 环境变量 GOOGLE_API_KEYS / MODEL_PRIORITY_LIST 未设置")

KEY_INDEX   = {k: idx for idx, k in enumerate(API_KEYS, 1)}
MODEL_INDEX = {m: idx for idx, m in enumerate(MODELS, 1)}
TOTAL_KEYS, TOTAL_MODELS = len(API_KEYS), len(MODELS)

# ───────── 4 · ComboLimiter ──────────
class ComboLimiter:
    def __init__(self, rpm, rpd):
        self.intv, self.rpd = 60/rpm, rpd
        self.calls, self.next_t, self.exhaust = 0, 0.0, False
        self.lock = asyncio.Lock()
    async def __aenter__(self):
        if self.exhaust: raise RuntimeError
        async with self.lock:
            now = time.monotonic()
            wait = self.next_t - now
            if wait > 0: await asyncio.sleep(wait)
            self.next_t = max(now, self.next_t) + self.intv
            self.calls += 1
            if self.calls >= self.rpd: self.exhaust = True
    async def __aexit__(self, *_) : ...

# ───────── 5 · Prompt 与 Chain 初始化 ──────────
ROOT = os.path.dirname(os.path.abspath(__file__))
PROMPT = ChatPromptTemplate.from_messages([
    ("system",  open(os.path.join(ROOT, "system.txt"), encoding="utf-8").read()),
    ("human",   open(os.path.join(ROOT, "template.txt"), encoding="utf-8").read())
])

CHAINS : Dict[Tuple[str, str], Any] = {}
LIMITER: Dict[Tuple[str, str], ComboLimiter] = {}

for key in API_KEYS:
    for model in MODELS:
        rpm, rpd = quota(model)
        LIMITER[(key, model)] = ComboLimiter(rpm, rpd)
        try:   llm = ChatGoogleNoRetry(model=model, google_api_key=key)
        except TypeError:
            llm = ChatGoogleNoRetry(model=model, api_key=key)
        CHAINS[(key, model)] = PROMPT | llm.with_structured_output(Structure)
        print(f"✔ {model:<18} @ {key[:6]}… RPM={rpm} RPD={rpd}")

# ───────── 6 · 工具函数 ──────────
good = lambda r: all(v and str(v).strip() and v != "ERROR" for v in r.model_dump().values())

async def invoke(chain, prompt, lim: ComboLimiter, retries: int):
    for _ in range(retries):
        try:
            async with lim:
                return await chain.ainvoke(prompt)
        except RuntimeError:
            raise
        except gexc.ResourceExhausted as e:
            if "FreeTier" in str(e):
                lim.exhaust = True; raise
            await asyncio.sleep(4)
        except Exception:
            await asyncio.sleep(2)
    raise RuntimeError

# ───────── 7 · 单篇处理 ──────────
async def process(paper, lang, retries):
    if not paper or not isinstance(paper, dict): return None
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}
    last_combo = None
    for model in MODELS:
        for key in API_KEYS:
            lim = LIMITER[(key, model)]
            if lim.exhaust: continue
            last_combo = (key, model)
            try:
                res = await invoke(CHAINS[(key, model)], prm, lim, retries)
                if res and good(res):
                    paper["AI"] = res.model_dump()
                    return paper, last_combo
            except (RuntimeError, gexc.ResourceExhausted):
                continue
    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    return paper, last_combo

# ───────── 8 · 进度与统计 ──────────
class ProgressReporter:
    def __init__(self, total):
        self.bar = tqdm(total=total, unit="paper")
        self.ok = 0
        self.model_counter = Counter()
        self.key_counter = Counter()

    def update(self, result, model, key):
        if result and "AI" in result and all(v != "ERROR" for v in result["AI"].values()):
            self.ok += 1
        self.model_counter[model] += 1
        self.key_counter[key] += 1
        self.bar.set_postfix(
            model=f"{model}[{MODEL_INDEX[model]}/{TOTAL_MODELS}]",
            key=f"{KEY_INDEX[key]}/{TOTAL_KEYS}·{key[:6]}"
        )
        self.bar.update()

    def close(self):
        self.bar.close()
        print(f"\n✅ {self.ok}/{self.bar.total} 完成\n")
        print("📊 模型使用分布：")
        for m, c in self.model_counter.items():
            print(f"  {m:<20} : {c}")
        print("📊 Key 使用分布：")
        for k, c in self.key_counter.items():
            print(f"  {k[:6]}… : {c}")

# ───────── 9 · 主程序 ──────────
async def main():
    args = cli()

    # 读文件 & 去重
    seen, papers = set(), []
    for line in open(args.data, encoding="utf-8"):
        if line.strip():
            d = json.loads(line)
            if d.get("id") and d["id"] not in seen:
                seen.add(d["id"])
                papers.append(d)

    total = len(papers)
    if total == 0:
        print(f"⚠️ 输入文件无可处理数据：{args.data}")
        return

    print(f"\n📑 {total} papers | concurrency {args.concurrency}\n")

    sem = asyncio.Semaphore(args.concurrency)
    async def worker(p):
        async with sem:
            return await process(p, args.language, args.retries)

    processed: List[dict] = []
    reporter = ProgressReporter(total)
    for coro in asyncio.as_completed([worker(p) for p in papers]):
        result = await coro
        if result is None:
            continue
        paper, (k, m) = result
        processed.append(paper)
        reporter.update(paper, m, k)
    reporter.close()

    outp = args.data.replace(".jsonl", f"_AI_enhanced_{args.language}.jsonl")
    with open(outp, "w", encoding="utf-8") as f:
        for row in processed:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"📁 输出保存至：{outp}")

if __name__ == "__main__":
    asyncio.run(main())
