#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enhance_arxiv.py — 并发 + 进度条 + 模型与 Key 编号显示 + 使用统计 + 健壮性防御
(最终版: 动态并发 + 密钥后六位显示 + 独立冷却)
"""

import os, sys, json, time, argparse, asyncio
from typing import Dict, Tuple, Any, List
from collections import Counter

import dotenv
from tqdm import tqdm
from google.api_core import exceptions as gexc
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

# 假设 structure.py 文件存在于同一目录，并定义了 Structure 类
# Example: from pydantic import BaseModel
# class Structure(BaseModel):
#     field1: str
#     field2: str
# 请确保您有这个文件和类定义
try:
    from structure import Structure
except ImportError:
    sys.exit("❌ 错误: 无法导入 'Structure' 类。请确保 'structure.py' 文件存在且定义正确。")


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
    "gemini-flash-latest":      (10, 250),
    "gemini-2.5-flash":         (10, 250),
    "gemini-flash-lite-latest": (15, 1000),
    "gemini-2.5-flash-lite":    (15, 1000),
    "gemini-1.5-flash":         (15, 50),
    "gemini-1.5-pro":           (2, 50),
}
# 使用精确匹配，如果找不到则给默认值
quota = lambda m: FREE.get(m, (10, 250)) 

# ───────── 3 · CLI & ENV ──────────
def cli():
    ap = argparse.ArgumentParser(description="Enhance arXiv JSONL with Gemini")
    ap.add_argument("--data", required=True, help="Path to the input .jsonl file.")
    ap.add_argument("--language", default="Chinese", help="Target language for the output.")
    ap.add_argument("--retries", type=int, default=3, help="Number of retries for each API call.")
    return ap.parse_args()

dotenv.load_dotenv()
API_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()]
MODELS   = [m.strip() for m in os.getenv("MODEL_PRIORITY_LIST", "").split(",") if m.strip()]
if not API_KEYS or not MODELS:
    sys.exit("❌ 环境变量 GOOGLE_API_KEYS / MODEL_PRIORITY_LIST 未设置或为空。")

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
try:
    SYSTEM_PROMPT_PATH = os.path.join(ROOT, "system.txt")
    HUMAN_PROMPT_PATH = os.path.join(ROOT, "template.txt")
    PROMPT = ChatPromptTemplate.from_messages([
        ("system",  open(SYSTEM_PROMPT_PATH, encoding="utf-8").read()),
        ("human",   open(HUMAN_PROMPT_PATH, encoding="utf-8").read())
    ])
except FileNotFoundError as e:
    sys.exit(f"❌ 错误: 提示词文件未找到: {e.filename}")

CHAINS : Dict[Tuple[str, str], Any] = {}
LIMITER: Dict[Tuple[str, str], ComboLimiter] = {}
print("正在初始化模型与密钥组合...")
for model in MODELS:
    for key in API_KEYS:
        rpm, rpd = quota(model)
        LIMITER[(key, model)] = ComboLimiter(rpm, rpd)
        try:
            llm = ChatGoogleNoRetry(model=model, google_api_key=key)
        except TypeError: # 兼容旧版 langchain-google-genai
            llm = ChatGoogleNoRetry(model=model, api_key=key)
        CHAINS[(key, model)] = PROMPT | llm.with_structured_output(Structure)
        print(f"✔ {model:<25} @ …{key[-6:]} RPM={rpm:<3} RPD={rpd:<4}")

# ───────── 6 · 工具函数 ──────────
good = lambda r: all(v and str(v).strip() and v != "ERROR" for v in r.model_dump().values())

async def invoke(chain, prompt, lim: ComboLimiter, retries: int):
    for attempt in range(retries):
        try:
            async with lim:
                return await chain.ainvoke(prompt)
        except RuntimeError: # Limiter exhausted
            raise
        except gexc.ResourceExhausted as e:
            if "FreeTier" in str(e) or "quota" in str(e).lower():
                lim.exhaust = True
                raise
            # 其他 ResourceExhausted 可能是临时性的，比如 "user rate limit"
            await asyncio.sleep(4 + attempt * 2) # 增加等待时间
        except Exception:
            if attempt < retries - 1:
                await asyncio.sleep(2 + attempt) # 增加等待时间
            else:
                raise # 最后一次尝试失败则抛出异常
    raise RuntimeError("invoke failed after all retries")

# ───────── 7 · 单篇处理 ──────────
async def process(paper, lang, retries, preferred_key: str):
    if not paper or not isinstance(paper, dict): return None
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}
    
    # 1. 优先尝试分配的 Key
    for model in MODELS:
        combo = (preferred_key, model)
        lim = LIMITER.get(combo)
        if not lim or lim.exhaust: continue
        try:
            res = await invoke(CHAINS[combo], prm, lim, retries)
            if res and good(res):
                paper["AI"] = res.model_dump()
                return paper, combo
        except (RuntimeError, gexc.ResourceExhausted):
            continue
        except Exception: # 捕获 invoke 最终抛出的异常
            continue

    # 2. 后备逻辑: 尝试所有其他组合
    for model in MODELS:
        for key in API_KEYS:
            if key == preferred_key: continue
            combo = (key, model)
            lim = LIMITER.get(combo)
            if not lim or lim.exhaust: continue
            try:
                res = await invoke(CHAINS[combo], prm, lim, retries)
                if res and good(res):
                    paper["AI"] = res.model_dump()
                    return paper, combo
            except (RuntimeError, gexc.ResourceExhausted):
                continue
            except Exception:
                continue

    # 3. 最终失败
    last_combo = (API_KEYS[-1], MODELS[-1])
    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    return paper, last_combo

# ───────── 8 · 进度与统计 ──────────
class ProgressReporter:
    def __init__(self, total):
        self.bar = tqdm(total=total, unit="paper", ncols=100, bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}{postfix}]')
        self.ok = 0
        self.model_counter = Counter()
        self.key_counter = Counter()

    def update(self, result, model, key):
        if result and "AI" in result and all(v != "ERROR" for v in result["AI"].values()):
            self.ok += 1
        self.model_counter[model] += 1
        self.key_counter[key] += 1
        self.bar.set_postfix_str(
            f"ok={self.ok}/{self.bar.n}, model={model}[{MODEL_INDEX[model]}/{TOTAL_MODELS}], key=…{key[-6:]}[{KEY_INDEX[key]}/{TOTAL_KEYS}]"
        )
        self.bar.update()

    def close(self):
        self.bar.close()
        print(f"\n✅ {self.ok}/{self.bar.total} 完成\n")
        print("📊 模型使用分布：")
        for m, c in self.model_counter.most_common():
            print(f"  {m:<25} : {c}")
        print("\n📊 Key 使用分布：")
        for k, c in self.key_counter.most_common():
            print(f"  …{k[-6:]} [Key {KEY_INDEX[k]}/{TOTAL_KEYS}] : {c}")

# ───────── 9 · 主程序 ──────────
async def main():
    args = cli()
    
    # 文件读取
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
    except json.JSONDecodeError:
        sys.exit(f"❌ 输入文件格式错误，不是有效的 JSONL: {args.data}")

    total = len(papers)
    if total == 0:
        print(f"⚠️ 输入文件无可处理数据：{args.data}")
        return

    # 并发数由密钥数量确定
    concurrency = len(API_KEYS)

    # 密钥队列，作为资源池
    key_queue = asyncio.Queue()
    for key in API_KEYS:
        await key_queue.put(key)

    # 信号量，控制总并发数
    sem = asyncio.Semaphore(concurrency)
    
    print(f"\n📑 {total} papers | Concurrency: {concurrency} (auto-set by key count) | Cooldown: 6s\n")

    # 辅助函数：带冷却的密钥归还
    async def cooldown_and_return_key(key: str, delay: int):
        await asyncio.sleep(delay)
        await key_queue.put(key)

    # Worker 封装
    async def worker(paper):
        async with sem:
            preferred_key = await key_queue.get()
            try:
                # 立即启动后台任务进行冷却和归还
                asyncio.create_task(cooldown_and_return_key(preferred_key, 6))
                # 等待处理完成
                return await process(paper, args.language, args.retries, preferred_key)
            except Exception as e:
                # 捕获 process 可能出现的未知严重错误
                print(f"\n🔥 Worker 内部发生严重错误: {e}")
                # 确保 key 能被归还
                # 检查 key 是否已在归还途中或已在队列中
                if preferred_key not in list(key_queue._queue):
                     asyncio.create_task(cooldown_and_return_key(preferred_key, 0)) # 立即归还
                
                # 返回一个明确的失败结果
                paper["AI"] = {f: "FATAL_ERROR" for f in Structure.model_fields.keys()}
                return paper, (preferred_key, "FATAL_ERROR")

    # 任务创建与执行
    reporter = ProgressReporter(total)
    processed_map = {}
    
    tasks = [worker(p) for p in papers]
    
    for future in asyncio.as_completed(tasks):
        result = await future
        if result is None or result[0] is None: 
            tqdm.write("一个 worker 返回了 None，已跳过。")
            continue
        
        paper, combo = result
        if combo is None or combo[0] is None: 
            tqdm.write(f"一篇论文 ({paper.get('id', 'N/A')}) 处理失败，组合信息为空。")
            continue

        key, model = combo
        processed_map[paper["id"]] = paper
        reporter.update(paper, model, key)

    reporter.close()

    # 文件写入
    outp = args.data.replace(".jsonl", f"_AI_enhanced_{args.language}.jsonl")
    with open(outp, "w", encoding="utf-8") as f:
        # 保持原始顺序
        for row in papers:
            if row['id'] in processed_map:
                f.write(json.dumps(processed_map[row['id']], ensure_ascii=False) + "\n")
    print(f"📁 输出保存至：{outp}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🚫 操作被用户中断。")