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

# ───────── 2 · 免费额度表 ──────────
FREE = {
    # Model Rate Limits (RPM, RPD)
    "gemini-flash-latest": (10, 250),
    "gemini-flash-lite-latest": (15, 1000),
    "gemini-2.5-flash-lite":  (15, 1000), # 包含 gemini-flash-lite-latest
    "gemini-2.5-pro":         (5, 100),
    "gemini-2.5-flash":       (10, 250),  # 包含 gemini-flash-latest
    "gemini-2.0-flash-lite":  (30, 200),
    "gemini-2.0-flash":       (15, 200),
}
quota = lambda m: next((v for p, v in FREE.items() if m.startswith(p)), (10, 250))

# ───────── 3 · CLI & ENV ──────────
def cli():
    ap = argparse.ArgumentParser(description="Enhance arXiv JSONL with Gemini")
    ap.add_argument("--data", required=True)
    ap.add_argument("--language", default="Chinese")
    ap.add_argument("--retries", type=int, default=3)
    ap.add_argument("--concurrency", type=int, default=None, help="并发数。如果未设置，将默认为 API 密钥数量的 2 倍。")
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
# 全局共享的、当天已耗尽 RPD 的 Key 黑名单
EXHAUSTED_KEYS = set()

class KeyPool:
    """Manages a pool of API keys to maximize aggregate throughput for a model."""
    def __init__(self, keys: List[str], model: str):
        self.model = model
        self.rpm, self.rpd = quota(model)
        self.cooldown = 60.0 / self.rpm if self.rpm > 0 else 0
        
        # RPD tracking
        self.rpd_counter = Counter()
        self.lock = asyncio.Lock()

        self.queue = asyncio.Queue()
        for key in keys:
            self.queue.put_nowait(key)

    async def get_key(self) -> str:
        """
        Gets an available key from the pool that has not reached its RPD limit.
        Blocks if no keys are available (either in cooldown or all are RPD-exhausted).
        """
        while True:
            key = await self.queue.get()
            # 检查该 Key 是否已在全局黑名单中
            if key in EXHAUSTED_KEYS:
                # 如果在，则不放回队列，继续获取下一个
                continue

            async with self.lock:
                if self.rpd_counter[key] < self.rpd:
                    # Key is valid, increment its usage and return
                    self.rpd_counter[key] += 1
                    return key
            # If we are here, the key was RPD-exhausted.
            # We don't put it back, effectively removing it from the pool for today.
            # The loop continues to get the next available key.

    def return_key(self, key: str):
        """Schedules a key to be returned to the pool after its cooldown."""
        asyncio.create_task(self._cooldown_and_return(key))

    async def mark_exhausted(self, key: str):
        """Forcefully marks a key as RPD-exhausted."""
        EXHAUSTED_KEYS.add(key)
        async with self.lock:
            self.rpd_counter[key] = self.rpd

    async def _cooldown_and_return(self, key: str):
        if self.cooldown > 0:
            await asyncio.sleep(self.cooldown)
        await self.queue.put(key)

# ───────── 5 · Prompt 与 Chain 初始化 ──────────
ROOT = os.path.dirname(os.path.abspath(__file__))
PROMPT = ChatPromptTemplate.from_messages([
    ("system",  open(os.path.join(ROOT, "system.txt"), encoding="utf-8").read()),
    ("human",   open(os.path.join(ROOT, "template.txt"), encoding="utf-8").read())
])

CHAINS : Dict[Tuple[str, str], Any] = {}
POOLS  : Dict[str, KeyPool] = {}

for model in MODELS:
    POOLS[model] = KeyPool(API_KEYS, model)
    rpm, rpd = POOLS[model].rpm, POOLS[model].rpd
    print(f"🔹 Model Pool: {model:<18} | Keys: {TOTAL_KEYS} | Aggregate RPM: {rpm*TOTAL_KEYS} | RPD/key: {rpd}")
    # 兼容新旧 langchain-google-genai 的 api_key 参数
    # 新版用 google_api_key，旧版用 api_key
    key_param_name = "google_api_key"
    try: ChatGoogleGenerativeAI(model="gemini-pro", google_api_key="test")
    except TypeError: key_param_name = "api_key"

    for key in API_KEYS:
        llm_kwargs = {"model": model, "max_retries": 0, key_param_name: key}
        llm = ChatGoogleGenerativeAI(**llm_kwargs)
        CHAINS[(key, model)] = PROMPT | llm.with_structured_output(Structure)

# ───────── 6 · 工具函数 ──────────
good = lambda r: all(v and str(v).strip() and v != "ERROR" for v in r.model_dump().values())

async def invoke(chain, prompt, retries: int):
    last_exception = None
    for i in range(retries):
        try:
            return await chain.ainvoke(prompt)
        except gexc.ResourceExhausted as e:
            # 这是一个不可恢复的错误，直接向上抛出
            raise e
        # 捕获其他可重试的 Google API 错误和常规网络错误
        except (gexc.GoogleAPICallError, IOError) as e:
            last_exception = e
            await asyncio.sleep(2)
    # 如果所有重试都失败，抛出最后一次捕获的可重试异常
    raise IOError("Failed after multiple retries") from last_exception

# ───────── 7 · 单篇处理 ──────────
async def process(paper, lang, retries):
    if not paper or not isinstance(paper, dict): return None
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}
    for model in MODELS:
        pool = POOLS[model]
        key = await pool.get_key()
        try:
            res = await invoke(CHAINS[(key, model)], prm, retries)
            if res and good(res):
                paper["AI"] = res.model_dump()
                pool.return_key(key) # 成功后归还密钥
                return paper, (key, model)
        except gexc.ResourceExhausted as e:
            # RPM limit hit. Return the key for cooldown and try the same model with another key.
            # This key will be available again after the cooldown.
            pool.return_key(key)
            # Log the temporary issue but continue to the next iteration of the loop for the *same* model
            # which will fetch a new key. We don't switch to the next model yet.
            # A small delay can help distribute requests.
            await asyncio.sleep(1)
            continue
        except (IOError, gexc.GoogleAPICallError) as e:
            # A persistent, non-rate-limit error occurred after retries.
            # The key is likely fine, but this model/key combo is problematic.
            # Return the key and try the next model.
            pool.return_key(key)
            continue

    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    return paper, ("FAILED", "FAILED")

# ───────── 8 · 进度与统计 ──────────
class ProgressReporter:
    def __init__(self, total):
        self.bar = tqdm(total=total, unit="paper")
        self.ok = 0
        self.model_counter = Counter()
        self.key_counter = Counter()

    @property
    def success_rate(self) -> float:
        return min(1.0, self.ok / self.bar.n) if self.bar.n > 0 else 0

    def update(self, result, model, key):
        if key == "FAILED":
            self.bar.update()
            return
        self.ok += 1 # 只要不是 FAILED，就视为一次成功的 API 调用
        self.model_counter[model] += 1
        self.key_counter[key] += 1
        self.bar.set_postfix(
            model=f"{model}[{MODEL_INDEX.get(model, 'X')}/{TOTAL_MODELS}]",
            key=f"{KEY_INDEX.get(key, 'X')}/{TOTAL_KEYS}·...{key[-6:]}",
            ok=f"{self.success_rate:.1%}"
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
            print(f"  ...{k[-6:]} : {c}")

# ───────── 9 · 主程序 ──────────
async def main():
    args = cli()

    # 如果用户没有指定并发数，则根据 API 密钥数量自动设置
    concurrency = args.concurrency
    if concurrency is None:
        concurrency = len(API_KEYS) * 2
        print(f"ℹ️ 未指定并发数，已根据密钥数量自动设置为: {concurrency}")

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

    print(f"\n📑 {total} papers | concurrency {concurrency}\n")

    sem = asyncio.Semaphore(concurrency)
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
        # 无论成功与否，都将结果加入列表，以保证输出文件保留所有论文记录
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
