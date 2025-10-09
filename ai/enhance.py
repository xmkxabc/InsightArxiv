#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enhance_arxiv.py — 并发 + 进度条 + 模型与 Key 编号显示 + 使用统计 + 健壮性防御
(最高效率模型：持续流动的资源池 | Max Efficiency Model: Continuous Flow Resource Pool)
"""

import os, sys, json, time, argparse, asyncio
from typing import Dict, Tuple, Any, List
from collections import Counter

import dotenv
from tqdm import tqdm
from google.api_core import exceptions as gexc
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from structure import Structure

# ───────── 1 · 自定义 LLM (无变化) ──────────
def _no_retry(f): return f

class ChatGoogleNoRetry(ChatGoogleGenerativeAI):
    def __init__(self, *a, **kw):
        req = dict(kw.pop("request_options", {}) or {}); req["retry"] = False
        super().__init__(*a, request_options=req, **kw)
        if hasattr(self, "_retry_decorator"):        self._retry_decorator = _no_retry
        if hasattr(self, "_async_retry_decorator"):  self._async_retry_decorator = _no_retry

# ───────── 2 · 免费额度表 (无变化) ──────────
FREE = {
    "gemini-1.5-flash":   (15, 50),
    "gemini-1.5-pro":     (2, 50),
    "gemini-2.5-flash":   (10, 250),
    "gemini-2.5-pro":     (5, 100),
    "gemini-2.5-flash-l": (15, 1000),
    "gemini-2.0-flash":   (15, 200),
    "gemini-2.0-flash-l": (30, 200),
}
quota = lambda m: next((v for p, v in FREE.items() if m.startswith(p)), (10, 250))

# ───────── 3 · CLI & ENV (恢复 concurrency) ──────────
def cli():
    ap = argparse.ArgumentParser(description="Enhance arXiv JSONL with Gemini")
    ap.add_argument("--data", required=True)
    ap.add_argument("--language", default="Chinese")
    ap.add_argument("--retries", type=int, default=3)
    # ✨ MODIFICATION: 恢复 concurrency 参数，实现更灵活的并发控制
    ap.add_argument("--concurrency", type=int, default=10, help="Overall maximum concurrent tasks.")
    return ap.parse_args()

dotenv.load_dotenv()
API_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()]
MODELS   = [m.strip() for m in os.getenv("MODEL_PRIORITY_LIST", "").split(",") if m.strip()]
if not API_KEYS or not MODELS:
    sys.exit("❌ 环境变量 GOOGLE_API_KEYS / MODEL_PRIORITY_LIST 未设置")

KEY_INDEX   = {k: idx for idx, k in enumerate(API_KEYS, 1)}
MODEL_INDEX = {m: idx for idx, m in enumerate(MODELS, 1)}
TOTAL_KEYS, TOTAL_MODELS = len(API_KEYS), len(MODELS)

# ... [第4、5、6节代码与上一版本完全相同，此处省略以节省空间] ...
# ... [Sections 4, 5, 6 are identical to the previous version and are omitted for brevity] ...
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
for model in MODELS:
    for key in API_KEYS:
        rpm, rpd = quota(model)
        LIMITER[(key, model)] = ComboLimiter(rpm, rpd)
        try:
            llm = ChatGoogleNoRetry(model=model, google_api_key=key)
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
            if "FreeTier" in str(e) or "quota" in str(e).lower():
                lim.exhaust = True; raise
            await asyncio.sleep(4)
        except Exception:
            await asyncio.sleep(2)
    raise RuntimeError("invoke failed after retries")


# ───────── 7 · 单篇处理 (与上一版本完全相同) ──────────
async def process(paper, lang, retries, preferred_key: str):
    if not paper or not isinstance(paper, dict): return None
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}
    
    # 1. 优先尝试分配的 Key
    for model in MODELS:
        combo = (preferred_key, model)
        lim = LIMITER[combo]
        if lim.exhaust: continue
        try:
            res = await invoke(CHAINS[combo], prm, lim, retries)
            if res and good(res):
                paper["AI"] = res.model_dump()
                return paper, combo
        except (RuntimeError, gexc.ResourceExhausted):
            continue

    # 2. 后备逻辑: 尝试所有其他组合
    for model in MODELS:
        for key in API_KEYS:
            if key == preferred_key: continue
            combo = (key, model)
            lim = LIMITER[combo]
            if lim.exhaust: continue
            try:
                res = await invoke(CHAINS[combo], prm, lim, retries)
                if res and good(res):
                    paper["AI"] = res.model_dump()
                    return paper, combo
            except (RuntimeError, gexc.ResourceExhausted):
                continue

    # 3. 最终失败
    last_combo = (API_KEYS[-1], MODELS[-1])
    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    return paper, last_combo

# ───────── 8 · 进度与统计 (无变化) ──────────
class ProgressReporter:
    def __init__(self, total):
        self.bar = tqdm(total=total, unit="paper", ncols=100)
        self.ok = 0
        self.model_counter = Counter()
        self.key_counter = Counter()

    def update(self, result, model, key):
        if result and "AI" in result and all(v != "ERROR" for v in result["AI"].values()):
            self.ok += 1
        self.model_counter[model] += 1
        self.key_counter[key] += 1
        self.bar.set_postfix(
            ok=f"{self.ok}/{self.bar.n}",
            model=f"{model}[{MODEL_INDEX[model]}/{TOTAL_MODELS}]",
            key=f"{KEY_INDEX[key]}/{TOTAL_KEYS}·{key[:6]}"
        )
        self.bar.update()

    def close(self):
        self.bar.close()
        print(f"\n✅ {self.ok}/{self.bar.total} 完成\n")
        print("📊 模型使用分布：")
        for m, c in self.model_counter.most_common():
            print(f"  {m:<20} : {c}")
        print("\n📊 Key 使用分布：")
        for k, c in self.key_counter.most_common():
            print(f"  {k[:6]}… [{KEY_INDEX[k]}/{TOTAL_KEYS}] : {c}")


# ───────── 9 · 主程序 (全新效率模型) ──────────
async def main():
    args = cli()
    
    # ... 文件读取部分无变化 ...
    seen, papers = set(), []
    try:
        with open(args.data, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    d = json.loads(line)
                    if d.get("id") and d["id"] not in seen:
                        seen.add(d["id"])
                        papers.append(d)
    except FileNotFoundError:
        sys.exit(f"❌ 输入文件未找到: {args.data}")

    total = len(papers)
    if total == 0:
        print(f"⚠️ 输入文件无可处理数据：{args.data}")
        return

    # ✨ NEW EFFICIENCY MODEL: SETUP
    # 1. 密钥队列，作为资源池
    key_queue = asyncio.Queue()
    for key in API_KEYS:
        await key_queue.put(key)

    # 2. 信号量，控制总并发数
    sem = asyncio.Semaphore(args.concurrency)
    
    if args.concurrency < len(API_KEYS):
        print(f"⚠️ 警告: 并发数({args.concurrency}) 小于密钥数({len(API_KEYS)})，可能无法充分利用所有密钥。")
    print(f"\n📑 {total} papers | Max concurrency: {args.concurrency} | Keys pool: {len(API_KEYS)}\n")

    # 3. 辅助函数：带冷却的密钥归还
    async def cooldown_and_return_key(key: str, delay: int):
        await asyncio.sleep(delay)
        await key_queue.put(key)

    # 4. Worker 封装
    async def worker(paper):
        async with sem: # 获取一个并发槽位
            # 从池中获取一个可用的 key，如果池空了会在此等待
            preferred_key = await key_queue.get()
            
            try:
                # 开始处理，处理函数本身是异步的
                # We can start the cooldown immediately after starting the process.
                # The key is "used" the moment the request is fired.
                
                # 立即启动一个后台任务来执行冷却和归还 key
                # 这样 key 的 6 秒冷却计时与 API 请求的耗时是并行进行的！
                asyncio.create_task(cooldown_and_return_key(preferred_key, 6))

                # 等待处理完成
                return await process(paper, args.language, args.retries, preferred_key)
            except Exception as e:
                # 确保即使 worker 内部发生意外，key 最终也能被归还
                print(f" worker 异常: {e}")
                if preferred_key not in list(key_queue._queue):
                     await key_queue.put(preferred_key) # 立即归还
                return None, (None, None) # 返回失败格式

    # 5. 任务创建与执行
    reporter = ProgressReporter(total)
    processed_map = {}
    
    tasks = [worker(p) for p in papers]
    
    for future in asyncio.as_completed(tasks):
        result = await future
        if result is None or result[0] is None: continue
        
        paper, combo = result
        if combo is None or combo[0] is None: continue

        key, model = combo
        processed_map[paper["id"]] = paper
        reporter.update(paper, model, key)

    reporter.close()

    # ... 文件写入部分无变化 ...
    outp = args.data.replace(".jsonl", f"_AI_enhanced_{args.language}.jsonl")
    with open(outp, "w", encoding="utf-8") as f:
        for row in papers:
            if row['id'] in processed_map:
                f.write(json.dumps(processed_map[row['id']], ensure_ascii=False) + "\n")
    print(f"📁 输出保存至：{outp}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🚫 操作被用户中断。")