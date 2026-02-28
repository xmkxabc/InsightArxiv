#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enhance_arxiv.py — 并发 + 进度条 + 模型与 Key 编号显示 + 使用统计 + 健壮性防御
(终极优化版: 动态冷却 + 动态并发 + 密钥后六位显示 + OpenAI 兼容 API 支持)
"""

import os, sys, json, time, argparse, asyncio
from typing import Dict, Tuple, Any, List
from collections import Counter

import dotenv
from tqdm import tqdm
from google.api_core import exceptions as gexc
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

try:
    from langchain_openai import ChatOpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False

try:
    from structure import Structure
except ImportError:
    sys.exit("❌ 错误: 无法导入 'Structure' 类。请确保 'structure.py' 文件存在且定义正确。")


# ───────── 1 · 自定义 LLM ──────────
def _no_retry(f): return f

class ChatGoogleNoRetry(ChatGoogleGenerativeAI):
    def __init__(self, *a, **kw):
        model_kwargs = dict(kw.pop("model_kwargs", {}) or {})
        request_opts = dict(model_kwargs.get("request_options") or {})
        request_opts["retry"] = False
        model_kwargs["request_options"] = request_opts
        kw["model_kwargs"] = model_kwargs
        super().__init__(*a, **kw)
        if hasattr(self, "_retry_decorator"):        self._retry_decorator = _no_retry
        if hasattr(self, "_async_retry_decorator"):  self._async_retry_decorator = _no_retry


# ───────── 2 · LLM 工厂函数 ──────────
def make_llm(provider: str, model: str, api_key: str, base_url: str = None):
    if provider == "google":
        try:
            return ChatGoogleNoRetry(model=model, google_api_key=api_key)
        except TypeError:
            return ChatGoogleNoRetry(model=model, api_key=api_key)
    elif provider == "openai":
        if not _OPENAI_AVAILABLE:
            sys.exit("langchain-openai not installed. Run: uv add langchain-openai")
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            max_retries=0,
            timeout=60,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")


# ───────── 3 · 免费额度表 (Google) ──────────
FREE = {
    "gemini-flash-latest":      (10, 250),
    "gemini-2.5-flash":         (10, 250),
    "gemini-flash-lite-latest": (15, 1000),
    "gemini-2.5-flash-lite":    (15, 1000),
    "gemini-1.5-flash":         (15, 50),
    "gemini-1.5-pro":           (2, 50),
}
quota = lambda m: FREE.get(m, (10, 250))

_UNLIMITED_RPD = 999_999

# ───────── 4 · CLI & ENV ──────────
def cli():
    ap = argparse.ArgumentParser(description="使用 Gemini/OpenAI 兼容 API 增强 arXiv 论文摘要")
    ap.add_argument("--data", required=True, help="输入的 .jsonl 文件路径。")
    ap.add_argument("--language", default="Chinese", help="希望 AI 输出的目标语言。")
    ap.add_argument("--retries", type=int, default=3, help="单次 API 调用的最大重试次数。")
    ap.add_argument("--probe", action="store_true", help="启动时并发探测所有 API 连通性，跳过不可达的（适合网络稳定的 CI/CD 环境）。")
    return ap.parse_args()

dotenv.load_dotenv()

# Google 配置
API_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()]
MODELS   = [m.strip() for m in os.getenv("MODEL_PRIORITY_LIST", "").split(",") if m.strip()]

# OpenAI 兼容配置
_OAI_BASE_URLS = [u.strip() for u in os.getenv("OPENAI_BASE_URLS", "").split(",") if u.strip()]
_OAI_API_KEYS  = [k.strip() for k in os.getenv("OPENAI_API_KEYS", "").split(",") if k.strip()]
_OAI_MODELS    = [m.strip() for m in os.getenv("OPENAI_MODELS", "").split(",") if m.strip()]
_OAI_RPMS      = [int(r) for r in os.getenv("OPENAI_RPMS", "60").split(",") if r.strip()]
_OAI_RPDS      = [int(d) if d.strip() and int(d) > 0 else _UNLIMITED_RPD
                  for d in os.getenv("OPENAI_RPDS", "0").split(",") if d.strip()]

if not API_KEYS and not _OAI_API_KEYS:
    sys.exit("❌ 未配置任何 API Key。请设置 GOOGLE_API_KEYS 或 OPENAI_API_KEYS。")


# ───────── 5 · ComboLimiter ──────────
class ComboLimiter:
    def __init__(self, rpm, rpd):
        self.intv, self.rpd = 60/rpm, rpd
        self.calls, self.next_t, self.exhaust = 0, 0.0, False
        self._lock = None

    @property
    def lock(self):
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def __aenter__(self):
        if self.exhaust: raise RuntimeError("日度配额已耗尽")
        async with self.lock:
            now = time.monotonic()
            wait = self.next_t - now
            if wait > 0: await asyncio.sleep(wait)
            self.next_t = max(now, self.next_t) + self.intv
            self.calls += 1
            if self.calls >= self.rpd: self.exhaust = True
    async def __aexit__(self, *_): ...


# ───────── 6 · Prompt 与 Chain 初始化 ──────────
ROOT = os.path.dirname(os.path.abspath(__file__))
try:
    PROMPT = ChatPromptTemplate.from_messages([
        ("system",  open(os.path.join(ROOT, "system.txt"), encoding="utf-8").read()),
        ("human",   open(os.path.join(ROOT, "template.txt"), encoding="utf-8").read()),
    ])
except FileNotFoundError as e:
    sys.exit(f"❌ 错误: 提示词文件未找到: {e.filename}")

# key = (idx, real_key, model)，idx 保证重复 key+model 的 slot 各自独立
CHAINS : Dict[Tuple[int, str, str], Any] = {}
LIMITER: Dict[Tuple[int, str, str], ComboLimiter] = {}
COMBO_META: Dict[Tuple[int, str, str], dict] = {}

# ───────── 7 · 连通性验证（异步，启动时并发探测）──────────
async def probe_combo(provider: str, model: str, key: str, base_url: str = None) -> bool:
    """发送极小请求验证 API 是否可达，返回 True 表示可用。"""
    try:
        if provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=key, base_url=base_url, max_retries=0, timeout=20)
            await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
            )
        else:
            import google.generativeai as genai
            genai.configure(api_key=key)
            m = genai.GenerativeModel(model)
            await asyncio.to_thread(m.generate_content, "hi")
        return True
    except Exception:
        return False


async def init_combos(skip_probe: bool = False):
    """初始化并并发探测所有 combo，跳过不可达的。"""
    print("Initializing model/key combinations...")

    candidates = []

    # OpenAI 优先
    for i, oai_key in enumerate(_OAI_API_KEYS):
        oai_model = _OAI_MODELS[i] if i < len(_OAI_MODELS) else (_OAI_MODELS[-1] if _OAI_MODELS else "gpt-4o-mini")
        oai_base  = _OAI_BASE_URLS[i] if i < len(_OAI_BASE_URLS) else (_OAI_BASE_URLS[-1] if _OAI_BASE_URLS else None)
        oai_rpm   = _OAI_RPMS[i] if i < len(_OAI_RPMS) else (_OAI_RPMS[-1] if _OAI_RPMS else 60)
        oai_rpd   = _OAI_RPDS[i] if i < len(_OAI_RPDS) else _UNLIMITED_RPD
        candidates.append(("openai", oai_model, oai_key, oai_base, oai_rpm, oai_rpd))

    # Google 后备
    for model in MODELS:
        for key in API_KEYS:
            rpm, rpd = quota(model)
            candidates.append(("google", model, key, None, rpm, rpd))

    # 并发探测（skip_probe=True 时跳过，直接全部加入）
    if skip_probe:
        probe_results = [True] * len(candidates)
    else:
        probe_tasks = [probe_combo(p, m, k, b) for p, m, k, b, _, _ in candidates]
        probe_results = await asyncio.gather(*probe_tasks, return_exceptions=True)

    ok_count = 0
    for idx, ((provider, model, key, base_url, rpm, rpd), ok) in enumerate(zip(candidates, probe_results)):
        if ok is True:
            slot = (idx, key, model)
            LIMITER[slot] = ComboLimiter(rpm, rpd)
            if provider == "openai":
                llm = make_llm("openai", model, key, base_url)
                CHAINS[slot] = PROMPT | llm.with_structured_output(Structure, method="json_mode")
            else:
                llm = make_llm("google", model, key)
                CHAINS[slot] = PROMPT | llm.with_structured_output(Structure)
            COMBO_META[slot] = {"provider": provider, "rpm": rpm}
            tag = "[OpenAI]" if provider == "openai" else "[Google]"
            print(f"[OK] {model:<25} @ ...{key[-6:]} RPM={rpm:<3} RPD={rpd:<6} {tag}")
            ok_count += 1
        else:
            err = str(ok) if isinstance(ok, Exception) else "unreachable"
            print(f"[SKIP] {model:<25} @ ...{key[-6:]} — {err[:60]}")

    if ok_count == 0:
        sys.exit("❌ 所有 API 均不可达，请检查网络或配置。")


# ───────── 8 · 工具函数 ──────────
# comments 字段对某些论文可为空，单独豁免
_OPTIONAL_FIELDS = {"comments"}

def good(r) -> bool:
    d = r.model_dump()
    return all(
        (v and str(v).strip() and v != "ERROR") or field in _OPTIONAL_FIELDS
        for field, v in d.items()
    )

async def invoke(chain, prompt, lim: ComboLimiter, retries: int):
    for attempt in range(retries):
        try:
            async with lim:
                return await chain.ainvoke(prompt)
        except RuntimeError:
            raise
        except gexc.ResourceExhausted as e:
            if "FreeTier" in str(e) or "quota" in str(e).lower():
                lim.exhaust = True
                raise
            await asyncio.sleep(4 + attempt * 2)
        except Exception as e:
            err_str = str(e).lower()
            # TPD/TPM 耗尽（Groq token per day）
            if "tokens_per_day" in err_str or "token_per_day" in err_str:
                lim.exhaust = True
                raise RuntimeError("日度 token 配额已耗尽") from e
            if "429" in err_str or "rate limit" in err_str or "too many requests" in err_str:
                await asyncio.sleep(4 + attempt * 2)
            elif attempt < retries - 1:
                await asyncio.sleep(2 + attempt)
            else:
                raise
    raise RuntimeError("invoke 函数在所有重试后仍然失败")


# ───────── 9 · 单篇处理 ──────────
async def process(paper, lang, retries, preferred_slot: tuple):
    if not paper or not isinstance(paper, dict): return None, None, 0
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}

    async def try_combo(slot):
        lim = LIMITER.get(slot)
        if not lim or lim.exhaust: return None
        try:
            res = await invoke(CHAINS[slot], prm, lim, retries)
            if res and good(res):
                paper["AI"] = res.model_dump()
                rpm = COMBO_META.get(slot, {}).get("rpm", 10)
                return paper, slot, rpm
        except (RuntimeError, gexc.ResourceExhausted, Exception):
            return None
        return None

    # 先试 preferred_slot 自身
    result = await try_combo(preferred_slot)
    if result: return result

    # fallback：试其他所有 slot
    for slot in CHAINS:
        if slot == preferred_slot: continue
        result = await try_combo(slot)
        if result: return result

    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    default_rpm = COMBO_META.get(next(iter(CHAINS)), {}).get("rpm", 10)
    last_combo = next(iter(CHAINS))
    return paper, last_combo, default_rpm


# ───────── 10 · 进度与统计 ──────────
class ProgressReporter:
    def __init__(self, total):
        self.bar = tqdm(total=total, unit="paper", ncols=100,
                        bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}{postfix}]')
        self.ok = 0
        self.model_counter = Counter()
        self.key_counter = Counter()

    def update(self, result, model, key):
        if result and "AI" in result and all(v != "ERROR" for v in result["AI"].values()):
            self.ok += 1
        self.model_counter[model] += 1
        self.key_counter[key] += 1
        self.bar.set_postfix_str(
            f"ok={self.ok}/{self.bar.n}, model={model}[{MODEL_INDEX.get(model, '?')}/{TOTAL_MODELS}], key=...{key[-6:]}[{KEY_INDEX.get(key, '?')}/{TOTAL_KEYS}]"
        )
        self.bar.update()

    def close(self):
        self.bar.close()
        print(f"\n[Summary] {self.ok}/{self.bar.total} succeeded\n")
        print("[Stats] Model usage distribution:")
        for m, c in self.model_counter.most_common():
            print(f"  {m:<25} : {c}")
        print("\n[Stats] Key usage distribution:")
        for k, c in self.key_counter.most_common():
            print(f"  ...{k[-6:]} [Key {KEY_INDEX.get(k, '?')}/{TOTAL_KEYS}] : {c}")


# ───────── 11 · 主程序 ──────────
async def main():
    args = cli()

    await init_combos(skip_probe=not args.probe)

    # 从所有 slot 中构建统计用的 key/model 列表（init_combos 完成后才有效）
    global ALL_KEYS, ALL_MODELS, KEY_INDEX, MODEL_INDEX, TOTAL_KEYS, TOTAL_MODELS
    ALL_SLOTS  = list(CHAINS.keys())                                   # [(idx, key, model), ...]
    ALL_KEYS   = list(dict.fromkeys([k for _, k, _ in ALL_SLOTS]))     # 去重，仅用于统计显示
    ALL_MODELS = list(dict.fromkeys([m for _, _, m in ALL_SLOTS]))
    KEY_INDEX   = {k: idx for idx, k in enumerate(ALL_KEYS, 1)}
    MODEL_INDEX = {m: idx for idx, m in enumerate(ALL_MODELS, 1)}
    TOTAL_KEYS, TOTAL_MODELS = len(ALL_KEYS), len(ALL_MODELS)

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
        print(f"[Warn] No usable records found in {args.data}")
        return

    concurrency = len(ALL_SLOTS)

    slot_queue = asyncio.Queue()
    for slot in ALL_SLOTS:
        await slot_queue.put(slot)

    print(f"\n[Run] {total} papers | Concurrency: {concurrency} | Cooling: Dynamic (based on model RPM)\n")

    async def cooldown_and_return_slot(slot: tuple, delay: float):
        await asyncio.sleep(delay + 0.1)
        await slot_queue.put(slot)

    async def worker(paper):
        # slot = (idx, real_key, model)，slot_queue 是并发限流器
        slot = await slot_queue.get()
        delay = 6.0
        try:
            paper_res, combo_res, rpm_res = await process(paper, args.language, args.retries, slot)
            if rpm_res > 0:
                delay = 60.0 / rpm_res
            asyncio.create_task(cooldown_and_return_slot(slot, delay))
            return paper_res, combo_res
        except Exception as e:
            print(f"\n[Error] Worker raised exception: {e}")
            asyncio.create_task(cooldown_and_return_slot(slot, delay))
            paper["AI"] = {f: "FATAL_ERROR" for f in Structure.model_fields.keys()}
            return paper, slot

    reporter = ProgressReporter(total)
    processed_map = {}
    tasks = [worker(p) for p in papers]

    for future in asyncio.as_completed(tasks):
        result = await future
        if result is None or result[0] is None:
            tqdm.write("一个 worker 返回了 None，已跳过。")
            continue

        paper, combo = result
        if combo is None:
            tqdm.write(f"一篇论文 ({paper.get('id', 'N/A')}) 处理失败，组合信息为空。")
            continue

        _, key, model = combo
        processed_map[paper["id"]] = paper
        reporter.update(paper, model, key)

    reporter.close()

    outp = args.data.replace(".jsonl", f"_AI_enhanced_{args.language}.jsonl")
    with open(outp, "w", encoding="utf-8") as f:
        for row in papers:
            if row['id'] in processed_map:
                f.write(json.dumps(processed_map[row['id']], ensure_ascii=False) + "\n")
    print(f"[Done] Output saved to: {outp}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Info] Interrupted by user.")
