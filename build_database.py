import os
import glob
import json
import gzip
import re
from collections import defaultdict, Counter
from datetime import datetime

# 扩展的停用词列表，用于构建搜索索引时忽略这些常见词
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'shall', 'we', 'they', 'you', 'it', 'he', 'she', 'his', 'her',
    'its', 'their', 'our', 'your', 'my', 'me', 'him', 'them', 'us', 'from', 'up', 'out',
    'down', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'can', 'just', 'now', 'also', 'however', 'although', 'though',
    'paper', 'method', 'approach', 'model', 'result', 'results', 'show', 'shows',
    'using', 'used', 'use', 'based', 'propose', 'proposed', 'algorithm', 'algorithms'
}

def create_chunked_index(search_index: dict, output_dir: str):
    """创建分块的搜索索引（仅对英文词汇分块）"""
    
    # 按字母分块（仅英文词汇）
    chunks = defaultdict(dict)
    chinese_words = {}  # 存储中文词汇
    
    for word, paper_ids in search_index.items():
        first_char = word[0].lower()
        # 只对英文词汇进行分块
        if first_char.isalpha() and ord(first_char) < 128:  # ASCII字母
            chunks[first_char][word] = paper_ids
        elif first_char.isdigit():
            chunks['0'][word] = paper_ids  # 数字
        else:
            # 中文词汇统一放到一个特殊分块中
            chinese_words[word] = paper_ids
    
    # 如果有中文词汇，创建专门的中文分块
    if chinese_words:
        chunks['zh'] = chinese_words
    
    # 保存分块文件
    chunk_manifest = []
    
    for chunk_key, chunk_data in chunks.items():
        chunk_filename = f"search_index_{chunk_key}.json"
        chunk_path = os.path.join(output_dir, chunk_filename)
        
        with open(chunk_path, 'w', encoding='utf-8') as f:
            json.dump(chunk_data, f, ensure_ascii=False, separators=(',', ':'))
        
        chunk_size = os.path.getsize(chunk_path) / (1024 * 1024)
        chunk_manifest.append({
            "key": chunk_key,
            "filename": chunk_filename,
            "wordCount": len(chunk_data),
            "sizeMB": round(chunk_size, 2)
        })
        
        print(f"创建分块 {chunk_key}: {len(chunk_data)} 词汇, {chunk_size:.2f} MB")
    
    # 保存分块清单
    manifest_path = os.path.join(output_dir, "search_index_manifest.json")
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump({
            "version": "1.0",
            "chunked": True,
            "chunks": chunk_manifest,
            "totalWords": sum(chunk["wordCount"] for chunk in chunk_manifest)
        }, f, indent=2, ensure_ascii=False)
    
    print(f"创建了 {len(chunks)} 个分块，总计 {sum(len(chunk) for chunk in chunks.values())} 词汇")

def build_optimized_search_index(search_index_dict: dict, output_dir: str):
    """构建优化的搜索索引（压缩和分块版本）"""
    
    print("\n开始构建优化的搜索索引...")
    
    # 过滤低频词汇（出现次数少于3次的词汇）
    MIN_FREQUENCY = 3
    word_counter = Counter()
    
    # 统计词频
    for word, paper_ids in search_index_dict.items():
        word_counter[word] = len(paper_ids)
    
    # 过滤低频词汇
    filtered_search_index = {}
    for word, paper_ids in search_index_dict.items():
        if word_counter[word] >= MIN_FREQUENCY:
            filtered_search_index[word] = paper_ids
    
    print(f"过滤后保留了 {len(filtered_search_index)} 个词汇（原始: {len(search_index_dict)}）")
    
    # 保存原始搜索索引（未压缩，但已过滤）
    search_index_path = os.path.join(output_dir, "search_index.json")
    with open(search_index_path, 'w', encoding='utf-8') as f:
        json.dump(filtered_search_index, f, ensure_ascii=False, separators=(',', ':'))
    
    # 保存压缩版本
    search_index_gz_path = os.path.join(output_dir, "search_index.json.gz")
    with gzip.open(search_index_gz_path, 'wt', encoding='utf-8') as f:
        json.dump(filtered_search_index, f, ensure_ascii=False, separators=(',', ':'))
    
    # 显示文件大小信息
    original_size = os.path.getsize(search_index_path) / (1024 * 1024)
    compressed_size = os.path.getsize(search_index_gz_path) / (1024 * 1024)
    
    print(f"\n搜索索引文件大小报告:")
    print(f"原始搜索索引 (过滤后): {original_size:.2f} MB")
    print(f"压缩搜索索引: {compressed_size:.2f} MB")
    print(f"压缩比: {(1 - compressed_size/original_size)*100:.1f}%")
    
    # 如果原始文件仍然很大，创建分块版本
    if original_size > 20:  # 如果超过20MB
        print(f"文件过大 ({original_size:.2f} MB)，创建分块版本...")
        create_chunked_index(filtered_search_index, output_dir)
    
    return filtered_search_index

def build_database_from_jsonl():
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

                    # --- [核心版本更新逻辑] ---
                    # 1. 提取基础ID和版本号
                    match = re.match(r'(\d+\.\d+)(v\d+)?', paper_id_full)
                    if not match:
                        skipped_paper_count += 1
                        continue
                    
                    base_id = match.group(1)
                    version = int(match.group(2)[1:]) if match.group(2) else 1

                    # 2. 检查是否需要更新
                    existing_paper = all_papers_map.get(base_id)
                    if existing_paper and existing_paper.get('_version', 1) >= version:
                        # 如果map中已存在的论文版本(existing_paper)比当前处理的论文版本(version)更高或相同，
                        # 则跳过当前这条记录，从而保留map中已有的高版本。
                        continue

                    # --- 数据整形 ---
                    ai_enhanced_info = raw_data.get("AI", {})
                    keywords_str = ai_enhanced_info.get("keywords", "")
                    keywords_list = [kw.strip() for kw in keywords_str.split(',') if kw.strip()] if isinstance(keywords_str, str) else []

                    paper_data = {
                        "id": base_id, # 存储基础ID
                        "full_id": paper_id_full, # 保留完整ID供参考
                        "_version": version, # 内部使用，记录版本号
                        "title": raw_data.get("title", "无标题"),
                        "date": file_date,
                        "url": raw_data.get("url", f"http://arxiv.org/abs/{paper_id_full}"),
                        "pdf_url": raw_data.get("pdf_link", f"http://arxiv.org/pdf/{paper_id_full}"),
                        "authors": ", ".join(raw_data.get("authors", [])),
                        "abstract": raw_data.get("summary", raw_data.get("abstract", "")),
                        "comment": raw_data.get("comments", ""), # 修正：爬虫中的字段是 'comments'
                        "categories": raw_data.get("categories", []),
                        "updated": raw_data.get("updated", file_date),
                        "first_published": raw_data.get("date", file_date), # 第一次发布日期

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
                    
                    all_papers_map[base_id] = paper_data

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

    # --- 第二阶段：从 all_papers_map 构建最终的数据结构和索引 ---
    monthly_data = defaultdict(list)
    search_index = defaultdict(set)
    category_index = defaultdict(set)

    for paper_id, paper_data in all_papers_map.items():
        # 清理掉内部使用的字段
        del paper_data['_version']
        
        # 按月份聚合
        year_month = paper_data['date'][:7]
        monthly_data[year_month].append(paper_data)

        # 构建搜索索引 - 增强版本，包含更多文本源
        text_sources = [
            paper_data.get("title", ""),
            paper_data.get("abstract", ""),
            paper_data.get("zh_title", ""),
            paper_data.get("translation", ""),
            " ".join(paper_data.get("keywords", [])),
            paper_data.get("tldr", ""),
        ]
        
        text_to_index = " ".join(filter(None, text_sources)).lower()
        tokens = re.findall(r'\b[a-z]{3,}\b', text_to_index)
        
        for token in tokens:
            if token not in STOP_WORDS and len(token) >= 3:
                search_index[token].add(paper_id)
        
        # 添加关键词到搜索索引
        for keyword in paper_data.get("keywords", []):
            if keyword and keyword.strip():
                clean_keyword = keyword.strip().lower()
                if clean_keyword not in STOP_WORDS:
                    search_index[clean_keyword].add(paper_id)

        # 构建分类索引
        for category in paper_data.get("categories", []):
            category_index[category].add(paper_id)

    # --- 开始写入文件 ---
    print("\n开始写入数据库文件...")
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

    # 构建并保存优化的搜索索引
    final_search_index = {token: list(ids) for token, ids in search_index.items()}
    build_optimized_search_index(final_search_index, output_dir)
    
    # 构建并保存分类索引
    final_category_index = {category: list(ids) for category, ids in category_index.items()}
    category_index_file_path = os.path.join(output_dir, "category_index.json")
    with open(category_index_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_category_index, f, ensure_ascii=False)
    print("成功写入分类索引文件 category_index.json。")
    old_db_path = "docs/database.json"
    if os.path.exists(old_db_path):
        os.remove(old_db_path)
        print(f"已删除旧的数据文件: {old_db_path}")

if __name__ == "__main__":
    build_database_from_jsonl()