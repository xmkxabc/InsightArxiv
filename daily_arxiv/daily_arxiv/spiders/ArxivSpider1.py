import scrapy
import os
import re


class ArxivSpider1(scrapy.Spider):
    name = "arxiv_1"
    allowed_domains = ["arxiv.org"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # 读取目标分类，默认是 cs.CV
        categories = os.environ.get("CATEGORIES", "cs.CV")
        self.target_categories = set(map(str.strip, categories.split(",")))

        # 是否严格过滤分类（默认 True，可通过环境变量配置）
        self.filter_by_category = os.environ.get("FILTER_BY_CATEGORY", "true").lower() == "true"

        # 构建起始 URL
        self.start_urls = [
            f"https://arxiv.org/list/{cat}/new" for cat in self.target_categories
        ]

    def parse(self, response):
        # 记录所有的 item anchors，用于过滤尾部无效链接
        anchors = []
        for li in response.css("div#dlpage ul li"):
            href = li.css("a::attr(href)").get()
            if href and "item" in href:
                try:
                    anchors.append(int(href.split("item")[-1]))
                except ValueError:
                    continue

        for paper_dt in response.css("dl dt"):
            paper_anchor = paper_dt.css("a[name^='item']::attr(name)").get()
            if not paper_anchor:
                continue

            try:
                paper_id = int(paper_anchor.split("item")[-1])
            except ValueError:
                continue

            if anchors and paper_id >= anchors[-1]:
                continue  # 跳过“尾部补充”的无效项

            # 获取摘要链接和 arXiv ID
            abstract_href = paper_dt.css("a[title='Abstract']::attr(href)").get()
            if not abstract_href:
                continue

            arxiv_id = abstract_href.split("/")[-1]
            abstract_url = response.urljoin(abstract_href)

            # 对应的 dd 元素，提取摘要和分类
            paper_dd = paper_dt.xpath("following-sibling::dd[1]")

            subjects_text = paper_dd.css(".list-subjects .primary-subject::text").get()
            if not subjects_text:
                subjects_text = paper_dd.css(".list-subjects::text").get()

            categories_in_paper = set()
            if subjects_text:
                categories_in_paper = set(re.findall(r"\(([^)]+)\)", subjects_text))

            # 是否满足目标分类
            if not self.filter_by_category or categories_in_paper.intersection(self.target_categories):
                yield {
                    "id": arxiv_id,
                    "abstract_url": abstract_url,
                    "categories": list(categories_in_paper),
                }
                self.logger.info(f"✔ Found paper {arxiv_id} with categories {categories_in_paper}")
            else:
                self.logger.debug(f"⏩ Skipped paper {arxiv_id} (categories {categories_in_paper} not in {self.target_categories})")
