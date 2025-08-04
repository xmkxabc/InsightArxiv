import scrapy
import os
import re

class ArxivSpider(scrapy.Spider):
    """
    一个通用的arXiv爬虫，具有以下特性：
    1. 可配置性：通过环境变量 `CATEGORIES` 指定要爬取的分类。
    2. 灵活筛选：可通过启动参数 `-a filter=false` 来关闭分类筛选，爬取所有论文。
    3. 数据丰富：提取论文的ID, 标题, 作者, 分类, PDF链接和评论。
    4. 健壮性：对可能缺失的元素进行检查，避免因页面结构微小变化而崩溃。
    5. 清晰日志：提供详细的运行日志，方便调试和监控。
    """
    name = "arxiv"  # 爬虫名称 (保持不变，因为你是通过这个名字运行的)
    allowed_domains = ["arxiv.org"]  # 允许爬取的域名

    # Pre-compile regex for performance
    # 预编译正则表达式以提升性能
    RE_SKIP_ANCHOR = re.compile(r'item=(\d+)')
    RE_PAPER_ID_ANCHOR = re.compile(r'(\d+)$')
    RE_CATEGORIES = re.compile(r'\(([^)]+)\)')

    def __init__(self, filter='true', *args, **kwargs):
        super().__init__(*args, **kwargs)

        # 1. 配置分类和起始URL
        # categories_str = os.environ.get("CATEGORIES", "cs.CR") # 默认爬取计算机视觉和人工智能
        # categories_str = os.environ.get("CATEGORIES", "cs.CR,cs.AI,cs.LG,cs.MA,cs.RO,cs.CV,cs.HC,cs.ET,cs.SE,cs.SI,cs.NI,cs.IT,cs.AR,cs.DC,cs.CY,cs.CE,cs.FL,eess.SY,eess.SP,eess.IV,eess.AS,cs.CL,cs.DS,cs.GR,cs.IR,cs.NE,math.NA,cs.SD,cs.SC,cs.SY,cs.TO") # 默认爬取计算机视觉和人工智能
        categories_str = os.environ.get(
            "CATEGORIES",
            "cs.AI,cs.AR,cs.CC,cs.CE,cs.CG,cs.CL,cs.CR,cs.CV,cs.CY,cs.DB,cs.DC,cs.DL,cs.DM,cs.DS,cs.ET,cs.FL,cs.GL,cs.GR,cs.GT,cs.HC,cs.IR,cs.IT,cs.LG,cs.LO,cs.MA,cs.MM,cs.MS,cs.NA,cs.NE,cs.NI,cs.OH,cs.OS,cs.PF,cs.PL,cs.RO,cs.SC,cs.SD,cs.SE,cs.SI,cs.SY,eess.AS,eess.IV,eess.SP,eess.SY,math.NA,stat.AP,q-fin.MF") # 默认爬取计算机视觉和人工智能
        self.categories_list = [cat.strip() for cat in categories_str.split(",")]
        self.start_urls = [f"https://arxiv.org/list/{cat}/new" for cat in self.categories_list]
        self.seen_ids = set() # 新增：用于跟踪已处理的论文ID
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

    def _get_skip_anchor_num(self, response):
        """
        智能解析页面，找到分页导航链接中的最大item编号。
        这用于过滤掉页面底部的 cross-lists，避免重复抓取。
        """
        nav_anchors = response.css("div#dlpage > small > a[href*='item']::attr(href)").getall()
        if not nav_anchors:
            return float('inf')

        try:
            last_anchor_href = nav_anchors[-1]
            match = self.RE_SKIP_ANCHOR.search(last_anchor_href)
            if match:
                return int(match.group(1))
            self.logger.warning(f"Could not find 'item' number in navigation anchor: {last_anchor_href}")
        except (AttributeError, IndexError, ValueError):
            self.logger.warning(f"Could not parse the navigation anchor number on {response.url}")
        return float('inf')

    def parse(self, response):
        self.logger.info(f"Parsing page: {response.url}")

        # 3. 新增：智能过滤页面底部的 cross-list 和导航链接
        # arXiv 页面底部会列出一些交叉分类的论文，它们的HTML结构与新论文相同。
        # 为了避免重复抓取和处理无效条目，我们找到分页导航链接中的最大item编号，
        # 并跳过所有编号大于或等于该编号的论文条目。
        skip_anchor_num = self._get_skip_anchor_num(response)
        # 遍历页面上每一篇论文的条目
        for paper in response.css("dl dt"):
            paper_anchor = paper.css("a[name^='item']::attr(name)").get()
            if not paper_anchor:
                continue # 如果没有锚点，跳过这个dt（可能是无效条目）
            
            # 使用正则表达式提取数字，比 str.replace 更健壮
            paper_id_match = self.RE_PAPER_ID_ANCHOR.search(paper_anchor)
            if not paper_id_match:
                continue

            # 如果当前论文的锚点数字大于或等于要跳过的数字，则停止处理
            if int(paper_id_match.group(1)) >= skip_anchor_num:
                continue

            # 4. 提取核心信息，并进行健壮性检查
            abstract_link = paper.css("a[title='Abstract']::attr(href)").get()
            if not abstract_link:
                continue
            arxiv_id = abstract_link.split("/")[-1]

            # 新增：在产出前检查ID是否已经存在
            if arxiv_id in self.seen_ids:
                self.logger.debug(f"Skipping already yielded paper: {arxiv_id}")
                continue
            self.seen_ids.add(arxiv_id)

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
            # 修复：使用更健壮的正则表达式来提取所有括号内的分类代码。
            # 旧的正则表达式 r'cs\.[A-Z]{2}|...' 会漏掉很多非cs/stat/eess领域或格式不符的分类。
            # 新的表达式 `r'\(([^)]+)\)'` 会提取所有在括号里的代码，例如 (cs.CV), (math.NA) 等。
            paper_categories = set(self.RE_CATEGORIES.findall(subjects_text))

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