import os
import glob
import json
import re
from collections import defaultdict
from datetime import datetime

# 定义一个简单的英文停用词列表，用于构建搜索索引时忽略这些常见词
STOP_WORDS = set([
    "a", "an", "the", "and", "or", "in", "on", "of", "for", "to", "with",
    "is", "are", "was", "were", "it", "its", "i", "you", "he", "she", "we", "they",
    "as", "at", "by", "from", "that", "this", "which", "who", "what", "where",
    "when", "why", "how", "not", "no", "but", "if", "so", "then", "just", "very"
])

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

        # 构建搜索索引
        text_to_index = (paper_data.get("title", "") + " " + paper_data.get("abstract", "")).lower()
        tokens = re.findall(r'\b[a-z]{3,}\b', text_to_index)
        for token in tokens:
            if token not in STOP_WORDS:
                search_index[token].add(paper_id)
        
        for keyword in paper_data.get("keywords", []):
            if keyword:
                search_index[keyword.lower()].add(paper_id)

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

    final_search_index = {token: list(ids) for token, ids in search_index.items()}
    search_index_file_path = os.path.join(output_dir, "search_index.json")
    with open(search_index_file_path, 'w', encoding='utf-8') as f:
        json.dump(final_search_index, f, ensure_ascii=False)
    print("成功写入搜索索引文件 search_index.json。")
    
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