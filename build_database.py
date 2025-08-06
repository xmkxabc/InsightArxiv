import os
import glob
import json
import re
from collections import defaultdict, Counter
from datetime import datetime
import multiprocessing
from functools import partial
import shutil

# --- 新增：引入NLTK进行词形还原，提升搜索质量 ---
# 首次运行时，需要安装NLTK: pip install nltk
try:
    import nltk
    from nltk.stem import WordNetLemmatizer
    # 检查并下载NLTK所需数据
    try:
        nltk.data.find('corpora/wordnet')
        nltk.data.find('corpora/omw-1.4')
    except LookupError:
        print("首次运行，正在下载NLTK数据包 (wordnet, omw-1.4)...")
        nltk.download('wordnet')
        nltk.download('omw-1.4')
    lemmatizer = WordNetLemmatizer()
    print("✅ NLTK WordNetLemmatizer loaded.")
except ImportError:
    nltk = None
    lemmatizer = None
    print("⚠️ Warning: 'nltk' not installed. English search will not use lemmatization.")

# 尝试导入jieba用于中文分词
try:
    import jieba
    print("✅ Jieba loaded for Chinese tokenization.")
except ImportError:
    jieba = None
    print("⚠️ Warning: 'jieba' not installed. Chinese search will be limited to exact keyword matches.")

# 扩展的停用词列表，用于构建搜索索引时忽略这些常见词
STOP_WORDS = {
    # English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'shall', 'we', 'they', 'you', 'it', 'he', 'she', 'his', 'her',
    'its', 'their', 'our', 'your', 'my', 'me', 'him', 'them', 'us', 'from', 'up', 'out',
    'down', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'can', 'just', 'now', 'also', 'however', 'although', 'though',
    # Domain-specific English
    'paper', 'method', 'approach', 'model', 'result', 'results', 'show', 'shows', 'using',
    'used', 'use', 'based', 'propose', 'proposed', 'algorithm', 'algorithms', 'study',
    'studies', 'work', 'new', 'novel', 'task', 'tasks', 'data', 'dataset',
    # Chinese
    '的', '了', '在', '是', '我', '有', '和', '你', '他', '她', '为', '之', '以', '而', '于', '等', '也',
    '还', '就', '都', '人', '因', '此', '被', '从', '到', '着', '个', '们', '其中', '如果', '那么',
    '我们', '他们', '她们', '它', '它们', '因为', '所以', '但是', '并且', '而且', '研究', '论文',
    '方法', '模型', '结果', '基于', '通过', '使用', '显示', '提出', '一个', '一种', '本文'
}

is_english_word = re.compile(r'^[a-z]+$')

def tokenize_text(text: str) -> set:
    """
    一个统一的、更智能的分词器，用于处理中英文混合文本 (V4 - 引入N-grams)。
    - 转换为小写。
    - 使用 jieba (如果可用) 进行中英文混合分词。
    - 使用 NLTK (如果可用) 对英文单词进行词形还原 (Lemmatization)，例如 'models' -> 'model'。
    - 生成 unigrams, bigrams, 和 trigrams (一元、二元、三元词组) 以支持短语搜索。
    - 移除停用词、过短的词和纯数字。
    """
    if not text or not isinstance(text, str):
        return set()

    # 1. 预处理
    text = text.lower()
    text = re.sub(r'[-_]', ' ', text)

    # 2. 分词
    if jieba:
        # 使用搜索模式分词，能更好地处理待搜索的文本
        initial_tokens = jieba.cut_for_search(text)
    else:
        # 简单的英文/数字分词器
        initial_tokens = re.findall(r'[a-z]+', text) # 只匹配字母，忽略数字

    # 3. 清理、词形还原和过滤，生成一个有序的词元列表
    cleaned_tokens = []
    for token in initial_tokens:
        clean_token = token.strip()
        
        # 对纯英文字母的词进行词形还原 (如果NLTK可用)
        if lemmatizer and is_english_word.match(clean_token):
            clean_token = lemmatizer.lemmatize(clean_token)

        # 过滤掉停用词和过短的词
        if clean_token and clean_token not in STOP_WORDS and not clean_token.isdigit() and len(clean_token) >= 2:
            cleaned_tokens.append(clean_token)

    # 4. 生成 N-grams (一元、二元、三元词组)
    all_grams = set(cleaned_tokens)  # 首先添加所有单个词 (unigrams)
    # 生成二元词组 (bigrams)
    all_grams.update(" ".join(cleaned_tokens[i:i+2]) for i in range(len(cleaned_tokens) - 1))
    # 生成三元词组 (trigrams)
    all_grams.update(" ".join(cleaned_tokens[i:i+3]) for i in range(len(cleaned_tokens) - 2))
            
    return all_grams

def process_paper_for_indexing(paper_data: dict) -> tuple:
    """
    处理单个论文，提取用于搜索和分类索引的信息。
    这是为多进程设计的独立工作单元。
    """
    paper_id = paper_data.get("id")
    if not paper_id:
        return None, None, None, None

    # 1. 提取并处理主要文本的搜索词元 (title, abstract, etc.)
    main_text_to_index = " ".join(filter(None, [
        paper_data.get("title", ""),
        paper_data.get("abstract", ""),
        paper_data.get("zh_title", ""),
        paper_data.get("translation", ""),
        paper_data.get("tldr", ""),
        paper_data.get("ai_comments", ""),
        paper_data.get("comment", ""),
    ]))
    search_tokens = tokenize_text(main_text_to_index)

    # 2. 单独处理并添加高质量的关键词短语
    keyword_phrases = set()
    for keyword in paper_data.get("keywords", []):
        if keyword and isinstance(keyword, str):
            # 清理关键词：转小写，移除多余空格
            clean_keyword = " ".join(keyword.lower().strip().split())
            if clean_keyword and len(clean_keyword) > 2 and clean_keyword not in STOP_WORDS:
                keyword_phrases.add(clean_keyword)
    
    # 3. 合并两种词元
    all_search_tokens = search_tokens.union(keyword_phrases)

    # 提取分类
    categories = paper_data.get("categories", [])

    # 按月份聚合
    year_month = paper_data.get('date', '')[:7]

    return paper_id, all_search_tokens, categories, year_month

def build_database_from_jsonl_fixed():
    """
    构建数据库的主函数。
    它从 'data' 目录下的所有 *_AI_enhanced_Chinese.jsonl 文件中读取数据，
    并智能地处理论文版本更新，只保留最新版本。然后生成：
    1. 按月份分片的数据文件 (database-YYYY-MM.json)
    2. 一个清单文件 (index.json)
    3. 一个专用的搜索索引文件 (search_index.json)
    4. 一个全新的分类索引文件 (category_index.json)
    """
    # 核心改动：使用一个字典来存储最新版本的论文，键为基础ID (e.g., "2401.12345")
    all_papers_map = {} 
    skipped_paper_count = 0

    output_dir = "docs/data"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"创建目录: {output_dir}")

    jsonl_files = glob.glob("data/*_AI_enhanced_Chinese.jsonl")
    if not jsonl_files:
        print("错误: 在 'data' 目录下没有找到任何 '_AI_enhanced_Chinese.jsonl' 文件。")
        return

    print(f"找到 {len(jsonl_files)} 个 .jsonl 数据源文件。开始处理...")

    # --- 第一阶段：读取所有数据，去重并只保留最新版本 ---
    for jsonl_file in sorted(jsonl_files): # 按文件名排序，确保处理顺序一致
        base_name = os.path.basename(jsonl_file)
        date_from_filename_match = re.match(r'(\d{4}-\d{2}-\d{2})', base_name)
        if not date_from_filename_match:
            print(f"警告: 无法从文件名 {base_name} 中提取日期，已跳过。")
            continue
        file_date = date_from_filename_match.group(1)

        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    raw_data = json.loads(line)
                    paper_id_full = raw_data.get("id")

                    if not paper_id_full or not isinstance(paper_id_full, str):
                        skipped_paper_count += 1
                        continue

                    # --- [核心版本更新逻辑 - 优化版] ---
                    # 步骤 1: 提取基础ID和版本号
                    match = re.match(r'(\d+\.\d+)(v\d+)?', paper_id_full)
                    if not match:
                        skipped_paper_count += 1
                        continue
                    
                    base_id = match.group(1)
                    current_version = int(match.group(2)[1:]) if match.group(2) else 1

                    # 步骤 2: 检查是否需要更新
                    existing_paper = all_papers_map.get(base_id)
                    if existing_paper and existing_paper.get('_version', 0) > current_version:
                        # 如果已存在的版本明确高于当前版本，则跳过。
                        # 注意：这里只用 > 而不是 >=，允许版本相同时进行元数据更新。
                        continue

                    # 步骤 3: 无论如何都先进行数据整形，准备一个完整的 paper_data 对象
                    ai_enhanced_info = raw_data.get("AI", {})
                    keywords_str = ai_enhanced_info.get("keywords", "")
                    keywords_list = [kw.strip() for kw in keywords_str.split(',') if kw.strip()] if isinstance(keywords_str, str) else []

                    current_paper_data = {
                        "id": base_id, # 存储基础ID
                        "full_id": paper_id_full, # 保留完整ID供参考
                        "_version": current_version, # 内部使用，记录版本号
                        "title": raw_data.get("title", "无标题"),
                        "date": file_date,
                        "url": raw_data.get("url", f"http://arxiv.org/abs/{paper_id_full}"),
                        "pdf_url": raw_data.get("pdf_link", f"http://arxiv.org/pdf/{paper_id_full}"),
                        "authors": ", ".join(raw_data.get("authors", [])),
                        "abstract": raw_data.get("summary", raw_data.get("abstract", "")),
                        "comment": raw_data.get("comment", raw_data.get("comments", "")),
                        "categories": raw_data.get("categories", []),
                        "updated": raw_data.get("updated", file_date),
                        "first_published": raw_data.get("published", raw_data.get("date", file_date)),
                        "zh_title": ai_enhanced_info.get("title_translation"),
                        "translation": ai_enhanced_info.get("translation"),
                        "keywords": keywords_list,
                        "tldr": ai_enhanced_info.get("tldr"),
                        "ai_comments": ai_enhanced_info.get("comments"),
                        "motivation": ai_enhanced_info.get("motivation"),
                        "method": ai_enhanced_info.get("method"),
                        "results": ai_enhanced_info.get("result"),
                        "conclusion": ai_enhanced_info.get("conclusion")
                    }

                    # 步骤 4: 执行最终的更新逻辑
                    if not existing_paper or current_version > existing_paper.get('_version', 0):
                        # 如果是新论文，或者当前版本更高，则完全替换
                        all_papers_map[base_id] = current_paper_data
                    elif current_version == existing_paper.get('_version', 0):
                        # 如果版本相同，我们可以选择性地更新元数据，比如保留更早的发布日期
                        existing_paper['first_published'] = min(existing_paper['first_published'], current_paper_data['first_published'])
                        existing_paper['updated'] = max(existing_paper['updated'], current_paper_data['updated'])
                        if current_paper_data.get("comment"):
                            existing_paper['comment'] = current_paper_data['comment']

                except (json.JSONDecodeError, AttributeError, TypeError) as e:
                    # print(f"Skipping line due to error: {e}") # for debugging
                    skipped_paper_count += 1
                    continue

    total_paper_count = len(all_papers_map)
    if total_paper_count == 0:
        print("警告: 未能成功处理任何论文。")
        return

    print(f"\n处理完成。数据库将包含 {total_paper_count} 篇唯一的最新版本论文。")
    if skipped_paper_count > 0:
        print(f"因格式错误或版本陈旧，总共跳过了 {skipped_paper_count} 条记录。")

    # --- 准备临时目录 ---
    temp_index_dir = os.path.join(output_dir, "temp_index")
    if os.path.exists(temp_index_dir):
        shutil.rmtree(temp_index_dir)
    os.makedirs(temp_index_dir)
    print(f"已创建临时索引目录: {temp_index_dir}")

    # 清理旧的索引文件，避免新旧文件混合
    print("正在清理旧的索引文件...")
    for f in glob.glob(os.path.join(output_dir, "search_index_*.*")):
        os.remove(f)
    if os.path.exists(os.path.join(output_dir, "search_index_manifest.json")):
        os.remove(os.path.join(output_dir, "search_index_manifest.json"))

    # --- 第二阶段：使用多进程并行构建索引 ---
    print(f"\n🚀 开始使用多进程并行构建索引 (使用 {multiprocessing.cpu_count()} 个核心)...")
    
    papers_list = list(all_papers_map.values())
    
    # 清理内部字段
    for paper in papers_list:
        if '_version' in paper:
            del paper['_version']

    temp_file_handles = {}
    category_index = defaultdict(set)
    monthly_data = defaultdict(list)
    with multiprocessing.Pool() as pool:
        # 使用 imap_unordered 来获取结果，这样可以更快地处理并显示进度
        # 它返回一个迭代器，而不是一次性返回所有结果，更节省内存
        results_iterator = pool.imap_unordered(process_paper_for_indexing, papers_list)
        
        processed_count = 0
        for i, result in enumerate(results_iterator):
            if result is None or result[0] is None:
                continue
            
            paper_id, search_tokens, categories, year_month = result
            
            # --- 核心优化：将搜索词元写入临时文件，避免内存溢出 ---
            # 核心改动：不将搜索词元聚合到内存，而是直接写入到按分块键组织的临时文件
            for token in search_tokens:
                first_char = token[0].lower()
                # 确定分块键 (a-z, 0 for digits, zh for others)
                chunk_key = '0' if first_char.isdigit() else first_char if first_char.isalpha() and ord(first_char) < 128 else 'zh'
                
                if chunk_key not in temp_file_handles:
                    filepath = os.path.join(temp_index_dir, f"{chunk_key}.part")
                    temp_file_handles[chunk_key] = open(filepath, 'a', encoding='utf-8')
                
                # 以制表符分隔的格式写入，便于后续处理
                temp_file_handles[chunk_key].write(f"{token}\t{paper_id}\n")
            
            # 分类索引和月度数据较小，可以继续在内存中聚合
            for category in categories:
                category_index[category].add(paper_id)

            # 按月份聚合数据 (需要原始paper_data)
            if year_month:
                 monthly_data[year_month].append(all_papers_map[paper_id])

            processed_count += 1
            if (i + 1) % 1000 == 0:
                print(f"  ...已处理 {i+1}/{total_paper_count} 篇论文")

    # 关闭所有临时文件句柄
    for handle in temp_file_handles.values():
        handle.close()

    print(f"✅ 多进程处理完成，共处理 {processed_count} 篇论文。")
    print("中间索引文件已写入临时目录。")

    # 释放内存
    del all_papers_map
    del papers_list

    # --- 第三阶段：从临时文件构建最终的分块搜索索引 ---
    print("\n⚙️ 开始从临时文件构建最终的分块搜索索引...")
    # 为不同长度的词条设置不同的频率阈值
    # 英文词条阈值
    MIN_FREQ_UNIGRAM = 2
    MIN_FREQ_BIGRAM = 3
    MIN_FREQ_TRIGRAM = 3
    # 为中文词条设置更高的阈值，以大幅减小索引体积
    MIN_FREQ_UNIGRAM_ZH = 7  # 再次提高
    MIN_FREQ_BIGRAM_ZH = 10  # 再次提高
    MIN_FREQ_TRIGRAM_ZH = 10 # 再次提高

    chunk_manifest = []
    stats = {"total_unique_words": 0, "chunks_created": 0, "total_size_mb": 0}

    part_files = glob.glob(os.path.join(temp_index_dir, "*.part"))

    for part_file in part_files:
        chunk_key = os.path.basename(part_file).replace('.part', '')
        print(f"  -> 正在处理分块: {chunk_key}")
        
        # 根据分块类型，选择不同的过滤阈值
        is_chinese_chunk = (chunk_key == 'zh')
        if is_chinese_chunk:
            print("     - 应用更高的中文词条过滤阈值。")
            unigram_thresh, bigram_thresh, trigram_thresh = MIN_FREQ_UNIGRAM_ZH, MIN_FREQ_BIGRAM_ZH, MIN_FREQ_TRIGRAM_ZH
        else:
            unigram_thresh, bigram_thresh, trigram_thresh = MIN_FREQ_UNIGRAM, MIN_FREQ_BIGRAM, MIN_FREQ_TRIGRAM
        
        # 1. 在内存中为当前分块构建索引
        chunk_index = defaultdict(list)
        with open(part_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    token, paper_id = line.strip().split('\t')
                    chunk_index[token].append(paper_id)
                except ValueError:
                    continue # Skip malformed lines

        # 2. 过滤低频词 (更智能的策略)
        frequent_chunk_index = {}
        for token, ids in chunk_index.items():
            num_words = token.count(' ') + 1
            freq = len(ids)
            
            keep = False
            if num_words == 1 and freq >= unigram_thresh:
                keep = True
            elif num_words == 2 and freq >= bigram_thresh:
                keep = True
            elif num_words >= 3 and freq >= trigram_thresh:
                keep = True
            
            if keep:
                # 去重并排序
                frequent_chunk_index[token] = sorted(list(set(ids)))
        
        if not frequent_chunk_index:
            print(f"     - 分块 {chunk_key} 无高频词，已跳过。")
            continue

        # 3. 写入最终的JSON分块文件
        chunk_filename = f"search_index_{chunk_key}.json"
        chunk_path = os.path.join(output_dir, chunk_filename)
        with open(chunk_path, 'w', encoding='utf-8') as f:
            json.dump(frequent_chunk_index, f, ensure_ascii=False, separators=(',', ':'))

        # 4. 收集统计信息
        chunk_size = os.path.getsize(chunk_path) / (1024 * 1024)
        word_count = len(frequent_chunk_index)
        stats["total_unique_words"] += word_count
        stats["total_size_mb"] += chunk_size
        stats["chunks_created"] += 1
        
        chunk_manifest.append({
            "key": chunk_key,
            "filename": chunk_filename,
            "wordCount": word_count,
            "sizeMB": round(chunk_size, 2)
        })
        print(f"  ✅ 分块 '{chunk_key}' 创建完成: {word_count} 词汇, {chunk_size:.2f} MB")

    # 5. 清理临时目录
    shutil.rmtree(temp_index_dir)
    print(f"🗑️ 已删除临时索引目录: {temp_index_dir}")

    # 6. 创建搜索索引清单文件
    search_manifest_path = os.path.join(output_dir, "search_index_manifest.json")
    search_manifest_data = {
        "version": "2.0", "chunked": True, "description": "分块搜索索引，优化加载性能",
        "chunks": sorted(chunk_manifest, key=lambda x: x["key"]), "totalWords": stats["total_unique_words"],
        "totalChunks": stats["chunks_created"], "totalSizeMB": round(stats["total_size_mb"], 2),
        "generatedAt": datetime.now().isoformat()
    }
    with open(search_manifest_path, 'w', encoding='utf-8') as f:
        json.dump(search_manifest_data, f, indent=2, ensure_ascii=False)
    print("✅ 成功写入搜索索引清单文件 search_index_manifest.json。")

    # --- 第四阶段：写入月度数据、分类索引和主清单文件 ---
    print("\n开始写入其他数据库文件...")
    for month, papers in monthly_data.items():
        sorted_papers = sorted(papers, key=lambda p: p['date'], reverse=True)
        month_file_path = os.path.join(output_dir, f"database-{month}.json")
        with open(month_file_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_papers, f, indent=2, ensure_ascii=False)
    print(f"成功写入 {len(monthly_data)} 个月度数据分片文件。")

    available_months = sorted(monthly_data.keys(), reverse=True)
    current_date = datetime.now().strftime("%Y-%m-%d")
    manifest = {
        "availableMonths": available_months, 
        "totalPaperCount": total_paper_count,
        "lastUpdated": current_date
    }
    manifest_file_path = os.path.join(output_dir, "index.json")
    with open(manifest_file_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("成功写入清单文件 index.json。")

    final_category_index = {category: list(ids) for category, ids in category_index.items()}
    category_index_file_path = os.path.join(output_dir, "category_index.json")
    with open(category_index_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_category_index, f, ensure_ascii=False)
    print("成功写入分类索引文件 category_index.json。")
    old_db_path = "docs/database.json"
    if os.path.exists(old_db_path):
        os.remove(old_db_path)
        print(f"已删除旧的数据文件: {old_db_path}")

# 为了安全地应用修复，我将原函数重命名，并创建一个新的调用它的函数
build_database_from_jsonl = build_database_from_jsonl_fixed

if __name__ == "__main__":
    build_database_from_jsonl()