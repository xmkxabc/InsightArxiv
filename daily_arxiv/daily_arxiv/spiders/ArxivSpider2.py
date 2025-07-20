import scrapy
import os
import re

class ArxivSpider2(scrapy.Spider):
    """
    一个通用的arXiv爬虫，具有以下特性：
    1. 可配置性：通过环境变量 `CATEGORIES` 指定要爬取的分类。
    2. 灵活筛选：可通过启动参数 `-a filter=false` 来关闭分类筛选，爬取所有论文。
    3. 数据丰富：提取论文的ID, 标题, 作者, 分类, PDF链接和评论。
    4. 健壮性：对可能缺失的元素进行检查，避免因页面结构微小变化而崩溃。
    5. 清晰日志：提供详细的运行日志，方便调试和监控。
    """
    name = "arxiv_2"  # 爬虫名称
    allowed_domains = ["arxiv.org"]  # 允许爬取的域名

    def __init__(self, filter='true', *args, **kwargs):
        super().__init__(*args, **kwargs)

        # 1. 配置分类和起始URL
        categories_str = os.environ.get("CATEGORIES", "cs.CV,cs.AI") # 默认爬取计算机视觉和人工智能
        self.categories_list = [cat.strip() for cat in categories_str.split(",")]
        self.start_urls = [f"https://arxiv.org/list/{cat}/new" for cat in self.categories_list]
        self.logger.info(f"Starting spider for categories: {self.categories_list}")

        # 2. 配置是否进行分类筛选
        # 允许通过命令行 `-a filter=false` 来关闭筛选
        self.filter_by_category = filter.lower() in ('true', '1', 't')
        if self.filter_by_category:
            self.target_categories = set(self.categories_list)
            self.logger.info(f"Category filtering is ENABLED. Target: {self.target_categories}")
        else:
            self.target_categories = set() # 设为空集，方便后续逻辑
            self.logger.info("Category filtering is DISABLED. All papers from start URLs will be scraped.")

    def get_clean_text(self, selector, css_selector):
        """辅助函数，用于安全地提取和清理文本"""
        element = selector.css(css_selector)
        if not element:
            return ""
        # 提取所有文本节点并合并，然后去除多余的空白
        return " ".join(element.css("::text").getall()).strip().replace('\n', ' ').replace('  ', ' ')

    def parse(self, response):
        self.logger.info(f"Parsing page: {response.url}")

        # 3. 智能跳过页面底部的 "total X entries" 链接
        # 这个链接的锚点是最大的，但它不是一篇论文，需要跳过
        total_entries_anchor = response.css("div#dlpage > ul > li:last-child a::attr(href)").get()
        skip_anchor_num = float('inf') # 默认为无穷大，即不跳过任何论文
        if total_entries_anchor and 'item' in total_entries_anchor:
            try:
                # 提取这个最大锚点的数字
                skip_anchor_num = int(total_entries_anchor.split('item')[-1])
            except (ValueError, IndexError):
                self.logger.warning("Could not parse the 'total entries' anchor number.")

        # 遍历页面上每一篇论文的条目
        for paper in response.css("dl dt"):
            # 提取当前论文的锚点数字
            paper_anchor = paper.css("a[name^='item']::attr(name)").get()
            if not paper_anchor:
                continue # 如果没有锚点，跳过这个dt（可能是无效条目）
            
            try:
                paper_id_num = int(paper_anchor.split("item")[-1])
            except (ValueError, IndexError):
                continue
            
            # 如果当前论文的锚点数字大于或等于要跳过的数字，则停止处理
            if paper_id_num >= skip_anchor_num:
                continue

            # 4. 提取核心信息，并进行健壮性检查
            abstract_link = paper.css("a[title='Abstract']::attr(href)").get()
            if not abstract_link:
                continue
            arxiv_id = abstract_link.split("/")[-1]

            pdf_link = paper.css("a[title='pdf']::attr(href)").get()
            if pdf_link:
                # 构造完整的PDF链接
                pdf_link = response.urljoin(pdf_link)

            # 获取对应的论文描述部分 (dd元素)
            paper_dd = paper.xpath("following-sibling::dd[1]")
            if not paper_dd:
                continue

            # 5. 提取更丰富的数据
            title = self.get_clean_text(paper_dd, ".list-title").replace("Title: ", "")
            authors = paper_dd.css(".list-authors a::text").getall()
            subjects_text = self.get_clean_text(paper_dd, ".list-subjects")
            comments = self.get_clean_text(paper_dd, ".list-comments")

            # 解析分类代码
            paper_categories = set(re.findall(r'cs\.[A-Z]{2}|stat\.[A-Z]{2}|eess\.[A-Z]{2}', subjects_text))

            # 6. 执行分类筛选逻辑（如果已启用）
            if self.filter_by_category and not self.target_categories.intersection(paper_categories):
                self.logger.debug(
                    f"Skipped paper {arxiv_id} with categories {paper_categories} (not in target)"
                )
                continue

            # 7. 产出最终的、数据丰富的Item
            self.logger.info(f"Found paper: {arxiv_id} - {title[:50]}...")
            yield {
                "id": arxiv_id,
                "title": title,
                "authors": authors,
                "categories": list(paper_categories),
                "primary_category": subjects_text.split(';')[0].strip(), # 提取主分类
                "pdf_link": pdf_link,
                "comments": comments,
                "url": response.urljoin(abstract_link),
            }