#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enhance_arxiv.py — 并发 + 进度条 + 模型与 Key 编号显示 + 使用统计 + 健壮性防御
(终极优化版: 动态冷却 + 动态并发 + 密钥后六位显示)
"""

# 导入必要的标准库和第三方库
import os, sys, json, time, argparse, asyncio
from typing import Dict, Tuple, Any, List
from collections import Counter

# 第三方库
import dotenv
from tqdm import tqdm
from google.api_core import exceptions as gexc
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

# 导入自定义的结构化输出类
# 这个文件需要用户自己创建，定义了希望AI返回的JSON格式
try:
    from structure import Structure
except ImportError:
    sys.exit("❌ 错误: 无法导入 'Structure' 类。请确保 'structure.py' 文件存在且定义正确。")


# ───────── 1 · 自定义 LLM ──────────
# 定义一个函数，它什么都不做，只是返回传入的函数本身。用于禁用重试。
def _no_retry(f): return f

# 创建一个自定义的ChatGoogleGenerativeAI类，以禁用其内置的自动重试机制。
# 我们将自己实现更精细的重试和回退逻辑。
class ChatGoogleNoRetry(ChatGoogleGenerativeAI):
    def __init__(self, *a, **kw):
        # 在初始化参数中强制设置retry为False
        req = dict(kw.pop("request_options", {}) or {}); req["retry"] = False
        super().__init__(*a, request_options=req, **kw)
        # 覆盖内部的重试装饰器，使其失效
        if hasattr(self, "_retry_decorator"):        self._retry_decorator = _no_retry
        if hasattr(self, "_async_retry_decorator"):  self._async_retry_decorator = _no_retry

# ───────── 2 · 免费额度表 ──────────
# 定义一个字典，存储各个Gemini模型的免费额度。
# 格式为: "模型名称": (每分钟请求数RPM, 每日请求数RPD)
FREE = {
    "gemini-flash-latest":      (10, 250),
    "gemini-2.5-flash":         (10, 250),
    "gemini-flash-lite-latest": (15, 1000),
    "gemini-2.5-flash-lite":    (15, 1000),
    "gemini-1.5-flash":         (15, 50),
    "gemini-1.5-pro":           (2, 50),
}
# 定义一个lambda函数，用于根据模型名称精确查找其额度。
# 如果在字典中找不到，则返回一个安全的默认值 (10, 250)。
quota = lambda m: FREE.get(m, (10, 250)) 

# ───────── 3 · CLI & ENV ──────────
# 定义命令行接口(CLI)，用于接收用户输入的参数。
def cli():
    ap = argparse.ArgumentParser(description="使用Gemini API增强arXiv论文摘要")
    ap.add_argument("--data", required=True, help="输入的.jsonl文件路径。")
    ap.add_argument("--language", default="Chinese", help="希望AI输出的目标语言。")
    ap.add_argument("--retries", type=int, default=3, help="单次API调用的最大重试次数。")
    return ap.parse_args()

# 加载.env文件中的环境变量
dotenv.load_dotenv()
# 从环境变量中读取API密钥列表和模型优先级列表
API_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()]
MODELS   = [m.strip() for m in os.getenv("MODEL_PRIORITY_LIST", "").split(",") if m.strip()]
# 如果未设置必要的环境变量，则退出程序
if not API_KEYS or not MODELS:
    sys.exit("❌ 环境变量 GOOGLE_API_KEYS / MODEL_PRIORITY_LIST 未设置或为空。")

# 创建用于显示和统计的索引和计数
KEY_INDEX   = {k: idx for idx, k in enumerate(API_KEYS, 1)}
MODEL_INDEX = {m: idx for idx, m in enumerate(MODELS, 1)}
TOTAL_KEYS, TOTAL_MODELS = len(API_KEYS), len(MODELS)

# ───────── 4 · ComboLimiter ──────────
# 一个精巧的异步速率限制器，用于遵守每个模型的RPM限制。
class ComboLimiter:
    def __init__(self, rpm, rpd):
        # 计算两次调用之间的最小秒数间隔
        self.intv, self.rpd = 60/rpm, rpd
        self.calls, self.next_t, self.exhaust = 0, 0.0, False
        self.lock = asyncio.Lock()  # 确保在多任务环境下对内部状态的访问是安全的
    
    # 实现异步上下文管理器协议
    async def __aenter__(self):
        if self.exhaust: raise RuntimeError("日度配额已耗尽")
        async with self.lock:
            now = time.monotonic()
            wait = self.next_t - now
            # 如果距离上次调用时间不足，则异步等待
            if wait > 0: await asyncio.sleep(wait)
            # 更新下一次可以调用的时间戳
            self.next_t = max(now, self.next_t) + self.intv
            self.calls += 1
            # 检查是否达到日度配额上限
            if self.calls >= self.rpd: self.exhaust = True
    async def __aexit__(self, *_) : ...

# ───────── 5 · Prompt 与 Chain 初始化 ──────────
# 获取当前脚本所在目录
ROOT = os.path.dirname(os.path.abspath(__file__))
try:
    # 从外部文件加载系统提示和用户模板
    SYSTEM_PROMPT_PATH = os.path.join(ROOT, "system.txt")
    HUMAN_PROMPT_PATH = os.path.join(ROOT, "template.txt")
    PROMPT = ChatPromptTemplate.from_messages([
        ("system",  open(SYSTEM_PROMPT_PATH, encoding="utf-8").read()),
        ("human",   open(HUMAN_PROMPT_PATH, encoding="utf-8").read())
    ])
except FileNotFoundError as e:
    sys.exit(f"❌ 错误: 提示词文件未找到: {e.filename}")

# 初始化用于存储LangChain调用链和速率限制器的字典
CHAINS : Dict[Tuple[str, str], Any] = {}
LIMITER: Dict[Tuple[str, str], ComboLimiter] = {}
print("正在初始化模型与密钥组合...")
# 遍历所有模型和密钥的组合，为每一个组合创建实例
for model in MODELS:
    for key in API_KEYS:
        rpm, rpd = quota(model)
        # 为每个(key, model)组合创建一个独立的速率限制器
        LIMITER[(key, model)] = ComboLimiter(rpm, rpd)
        try:
            # 初始化不带重试的LLM实例
            llm = ChatGoogleNoRetry(model=model, google_api_key=key)
        except TypeError: # 兼容旧版langchain-google-genai包
            llm = ChatGoogleNoRetry(model=model, api_key=key)
        # 将提示、LLM和结构化输出解析器组合成一个调用链
        CHAINS[(key, model)] = PROMPT | llm.with_structured_output(Structure)
        # 打印初始化信息，显示密钥的后六位
        print(f"✔ {model:<25} @ …{key[-6:]} RPM={rpm:<3} RPD={rpd:<4}")

# ───────── 6 · 工具函数 ──────────
# 检查AI返回的结果是否有效（非空、非"ERROR"字符串）
good = lambda r: all(v and str(v).strip() and v != "ERROR" for v in r.model_dump().values())

# 封装了重试逻辑的API调用函数
async def invoke(chain, prompt, lim: ComboLimiter, retries: int):
    for attempt in range(retries):
        try:
            # 使用特定于模型的速率限制器
            async with lim:
                return await chain.ainvoke(prompt)
        except RuntimeError: # Limiter的日度配额耗尽
            raise
        except gexc.ResourceExhausted as e:
            # 如果是免费套餐的日度配额耗尽，则标记并抛出异常
            if "FreeTier" in str(e) or "quota" in str(e).lower():
                lim.exhaust = True
                raise
            # 其他ResourceExhausted可能是临时的，比如"user rate limit"，进行带退避的重试
            await asyncio.sleep(4 + attempt * 2) # 增加等待时间
        except Exception:
            if attempt < retries - 1:
                await asyncio.sleep(2 + attempt) # 其他异常，也进行带退避的重试
            else:
                raise # 最后一次尝试失败则抛出异常
    raise RuntimeError("invoke函数在所有重试后仍然失败")

# ───────── 7 · 单篇处理 ──────────
# 核心处理函数，负责处理单篇论文
async def process(paper, lang, retries, preferred_key: str):
    if not paper or not isinstance(paper, dict): return None, None, 0
    prm = {"title": paper["title"], "content": paper["summary"], "language": lang}
    
    # 定义一个内部辅助函数，以避免代码重复
    async def try_combo(key, model):
        combo = (key, model)
        lim = LIMITER.get(combo)
        if not lim or lim.exhaust: return None # 如果限制器不存在或已耗尽，跳过
        try:
            # 调用带重试的invoke函数
            res = await invoke(CHAINS[combo], prm, lim, retries)
            if res and good(res):
                paper["AI"] = res.model_dump()
                rpm, _ = quota(model)
                # 成功时返回处理好的论文、使用的组合、以及该模型的RPM
                return paper, combo, rpm
        except (RuntimeError, gexc.ResourceExhausted, Exception):
            # 捕获所有可能的异常，静默失败，让主循环继续尝试下一个组合
            return None
        return None
    
    # 1. 优先策略: 尝试分配给这个任务的"首选密钥"，遍历所有模型
    for model in MODELS:
        result = await try_combo(preferred_key, model)
        if result: return result

    # 2. 后备(Fallback)策略: 如果首选密钥失败，则遍历所有其他密钥
    for model in MODELS:
        for key in API_KEYS:
            if key == preferred_key: continue # 跳过已经失败的首选密钥
            result = await try_combo(key, model)
            if result: return result

    # 3. 最终失败: 如果所有组合都失败了
    last_combo = (API_KEYS[-1], MODELS[-1])
    paper["AI"] = {f: "ERROR" for f in Structure.model_fields.keys()}
    # 失败时返回一个基于最高优先级模型的RPM，以提供一个安全的默认冷却时间
    default_rpm, _ = quota(MODELS[0])
    return paper, last_combo, default_rpm

# ───────── 8 · 进度与统计 ──────────
# 一个用于显示tqdm进度条和最终统计报告的类
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
        # 更新进度条的后缀信息，显示密钥后六位
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
        # 最终统计也显示密钥后六位
        for k, c in self.key_counter.most_common():
            print(f"  …{k[-6:]} [Key {KEY_INDEX[k]}/{TOTAL_KEYS}] : {c}")

# ───────── 9 · 主程序 ──────────
async def main():
    args = cli()
    
    # 读取并预处理输入的jsonl文件
    seen, papers = set(), []
    try:
        with open(args.data, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    d = json.loads(line)
                    # 通过ID去重
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

    # 核心并发控制：并发数由密钥数量动态确定
    concurrency = len(API_KEYS)

    # 使用asyncio.Queue作为密钥资源池，实现持续流动
    key_queue = asyncio.Queue()
    for key in API_KEYS:
        await key_queue.put(key)

    # 使用asyncio.Semaphore来限制同时运行的worker总数
    sem = asyncio.Semaphore(concurrency)
    
    print(f"\n📑 {total} papers | Concurrency: {concurrency} (auto-set) | Cooling: Dynamic (based on model RPM)\n")

    # 辅助函数：根据动态延迟，将Key异步归还到资源池
    async def cooldown_and_return_key(key: str, delay: float):
        # 添加一个0.1秒的安全边际，以应对网络延迟等微小误差
        await asyncio.sleep(delay + 0.1)
        await key_queue.put(key)

    # 定义处理单个任务的worker
    async def worker(paper):
        # 从信号量获取一个并发槽位
        async with sem:
            # 从资源池获取一个可用的Key，如果池空了则在此异步等待
            preferred_key = await key_queue.get()
            delay = 6.0 # 设定一个默认的、安全的冷却时间
            try:
                # 调用核心处理函数
                paper_res, combo_res, rpm_res = await process(paper, args.language, args.retries, preferred_key)
                
                # 根据返回的rpm计算动态冷却时间
                if rpm_res > 0:
                    delay = 60.0 / rpm_res
                
                # 立即创建一个独立的后台任务，负责在冷却结束后归还Key
                # 这样，API请求的耗时和Key的冷却计时可以并行进行，提升效率
                asyncio.create_task(cooldown_and_return_key(preferred_key, delay))
                
                return paper_res, combo_res
            except Exception as e:
                # 捕获worker内部的未知严重错误，确保程序不会崩溃
                print(f"\n🔥 Worker 内部发生严重错误: {e}")
                # 即使出错，也要确保Key能被归还
                asyncio.create_task(cooldown_and_return_key(preferred_key, delay))
                paper["AI"] = {f: "FATAL_ERROR" for f in Structure.model_fields.keys()}
                return paper, (preferred_key, "FATAL_ERROR")

    # 创建所有任务并启动执行
    reporter = ProgressReporter(total)
    processed_map = {}
    tasks = [worker(p) for p in papers]
    
    # 使用asyncio.as_completed来处理完成的任务，一有任务完成就立即处理结果
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
        # 将处理结果存入字典，以便后续按原始顺序写入文件
        processed_map[paper["id"]] = paper
        reporter.update(paper, model, key)

    reporter.close()

    # 将处理结果写入新的jsonl文件
    outp = args.data.replace(".jsonl", f"_AI_enhanced_{args.language}.jsonl")
    with open(outp, "w", encoding="utf-8") as f:
        # 遍历原始论文列表，以保持原始顺序
        for row in papers:
            if row['id'] in processed_map:
                f.write(json.dumps(processed_map[row['id']], ensure_ascii=False) + "\n")
    print(f"📁 输出保存至：{outp}")

# 程序入口
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🚫 操作被用户中断。")