import json
import os
import sys
import argparse
import re
from collections import defaultdict
from datetime import datetime

def parse_arguments():
    """解析命令行参数，与 run.yml 工作流保持一致。"""
    parser = argparse.ArgumentParser(description="将JSONL文件转换为功能完善的Markdown报告。")
    parser.add_argument("--input", type=str, required=True, help="输入的 JSONL 文件路径")
    parser.add_argument("--template", type=str, required=True, help="单篇论文的模板文件路径")
    parser.add_argument("--output", type=str, required=True, help="输出的 Markdown 文件路径")
    return parser.parse_args()

def load_jsonl_data(file_path):
    """从JSONL文件加载数据，处理文件不存在或为空的情况。"""
    if not os.path.exists(file_path):
        print(f"信息: 输入文件未找到 {file_path}", file=sys.stdout)
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = [json.loads(line) for line in f if line.strip()]
        if not data:
            print(f"信息: JSONL文件为空 {file_path}.", file=sys.stdout)
            return None
        return data
    except json.JSONDecodeError as e:
        print(f"错误: 解析JSONL文件失败 {file_path}: {e}", file=sys.stderr)
        return None

def load_template(file_path):
    """加载模板文件，处理文件未找到的错误。"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"错误: 模板文件未找到 {file_path}", file=sys.stderr)
        sys.exit(1)

def slugify(text):
    """为TOC创建健壮的、GitHub兼容的锚点链接。"""
    text = str(text).lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    return text

def main():
    """主函数，生成Markdown报告。"""
    args = parse_arguments()
    
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', args.output)
    date_str = date_match.group(1) if date_match else datetime.now().strftime('%Y-%m-%d')

    all_papers_data = load_jsonl_data(args.input)
    paper_template = load_template(args.template)

    if not all_papers_data:
        final_content = f"# AI-Enhanced arXiv Daily {date_str}\n\n"
        final_content += "### 今日没有找到新论文。\n"
        with open(args.output, "w", encoding='utf-8') as f:
            f.write(final_content)
        print(f"成功生成报告 (无新论文): {args.output}")
        sys.exit(0)

    # --- 1. 数据分类和排序 ---
    preference_str = os.environ.get('CATEGORIES', 'cs.CV,cs.CL,cs.LG,cs.AI,stat.ML,eess.IV')
    preference = [cat.strip() for cat in preference_str.split(',')]
    
    # 新的数据结构：主论文和交叉引用
    primary_papers = defaultdict(list)
    cross_references = defaultdict(list)
    all_categories = set()

    for paper in all_papers_data:
        # 兼容 "categories" 和 "cate" 字段
        categories = paper.get("categories") or ([paper.get("cate")] if paper.get("cate") else [])
        if not categories:
            categories = ["Uncategorized"]
            
        paper['all_categories_str'] = ", ".join(categories) # 存储所有分类，用于模板显示

        # 确定主分类
        primary_cat = categories[0]
        primary_papers[primary_cat].append(paper)
        all_categories.add(primary_cat)
        
        # 为次要分类创建交叉引用
        for secondary_cat in categories[1:]:
            cross_references[secondary_cat].append({
                "id": paper.get("id"),
                "title": paper.get("title"),
                "primary_category_slug": slugify(primary_cat) # 用于生成锚点链接
            })
            all_categories.add(secondary_cat)

    # 对所有出现的分类进行排序
    def rank(category):
        try:
            return preference.index(category)
        except ValueError:
            return len(preference)
    sorted_categories = sorted(list(all_categories), key=rank)

    # --- 2. 预先渲染所有主论文卡片 ---
    rendered_papers = {}
    for idx, paper in enumerate(all_papers_data):
        ai_data = paper.get('AI', {})
        
        context = {
            "idx": idx + 1,
            "id": paper.get("id", "N/A"),
            "title": paper.get("title", "N/A"),
            "authors": ", ".join(paper.get("authors", ["N/A"])),
            "comment": paper.get("comment", "无"),
            "pdf_url": paper.get("pdf_url", "N/A"),
            "url": f"https://arxiv.org/abs/{paper.get('id', '')}",
            "cate": paper.get("categories", ["N/A"])[0],
            "categories": paper.get('all_categories_str', 'N/A'), # 使用我们创建的完整分类字符串
            "updated": paper.get("updated", "N/A"), # 使用更新日期

            "title_translation": ai_data.get('title_translation', 'N/A'),
            "keywords": ai_data.get('keywords', 'N/A'),
            "tldr": ai_data.get('tldr', 'N/A'),
            "motivation": ai_data.get('motivation', 'N/A'),
            "method": ai_data.get('method', 'N/A'),
            "conclusion": ai_data.get('conclusion', 'N/A'),
            "ai_comment": ai_data.get('comments', 'N/A'),
            "results": ai_data.get('result', 'N/A'),
            "ai_Abstract": ai_data.get('summary', 'N/A'),
            "abstract_translation": ai_data.get('translation', 'N/A'),
        }
        
        temp_paper_content = paper_template
        for key, value in context.items():
            temp_paper_content = temp_paper_content.replace(f"{{{key}}}", str(value or ''))
        
        # 使用论文ID作为锚点，这样交叉引用才能找到它
        paper_anchor = f"<a id='{slugify(paper.get('id'))}'></a>\n"
        rendered_papers[paper.get("id")] = paper_anchor + temp_paper_content

    # --- 3. 生成TOC (目录) ---
    toc_parts = [f"## 今日总计: {len(all_papers_data)} 篇独立论文", "### 目录"]
    for cate in sorted_categories:
        slug = slugify(cate)
        # 目录计数现在只计算主论文数
        primary_count = len(primary_papers[cate])
        cross_ref_count = len(cross_references[cate])
        
        count_str = f"{primary_count}"
        if cross_ref_count > 0:
            count_str += f" (+{cross_ref_count} 篇交叉引用)"
            
        toc_parts.append(f"- [{cate}](#{slug}) ({count_str})")
    
    # --- 4. 按分类组装最终内容 ---
    content_by_category_str = ""
    for cate in sorted_categories:
        slug = slugify(cate)
        content_by_category_str += f"<a id='{slug}'></a>\n## {cate} \n\n"
        
        # 渲染主论文
        if primary_papers[cate]:
            for paper_data in primary_papers[cate]:
                paper_id = paper_data.get("id")
                if paper_id in rendered_papers:
                    content_by_category_str += rendered_papers[paper_id]
                    content_by_category_str += f"\n[⬆️ 返回分类顶部](#{slug}) | [⬆️ 返回总目录](#toc)\n\n---\n\n"
        else:
            # 如果某个分类只有交叉引用，没有主论文，可以加个提示
            content_by_category_str += "本分类下无主论文。\n\n"

        # 渲染交叉引用
        if cross_references[cate]:
            content_by_category_str += "*<small>亦可见于本分类 (来自其他主分类):</small>*\n"
            for ref in cross_references[cate]:
                # 链接到论文的锚点，锚点由论文ID生成
                ref_anchor = slugify(ref['id'])
                content_by_category_str += f"- *<small><a href=\"#{ref_anchor}\">{ref['title']}</a></small>*\n"
            content_by_category_str += "\n---\n\n"

    # --- 5. 组装最终的完整Markdown页面 ---
    report_title = f"# AI-Enhanced arXiv Daily {date_str}\n\n"
    toc_anchor = "<a id='toc'></a>\n"
    final_toc = "\n".join(toc_parts) + "\n\n---\n"
    
    final_content = report_title + toc_anchor + final_toc + content_by_category_str.strip().removesuffix('---')

    with open(args.output, "w", encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"成功将 {len(all_papers_data)} 篇论文转换为Markdown，并保存到 {args.output}")

if __name__ == "__main__":
    main()