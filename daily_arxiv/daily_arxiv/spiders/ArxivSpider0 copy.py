import scrapy
import os


class ArxivSpider(scrapy.Spider):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        categories = os.environ.get("CATEGORIES", "cs.CV")
        categories = categories.split(",")
        categories = list(map(str.strip, categories))
        self.start_urls = [
            f"https://arxiv.org/list/{cat}/new" for cat in categories
        ]  # 起始URL（计算机科学领域的最新论文）

    name = "arxiv_0"  # 爬虫名称
    allowed_domains = ["arxiv.org"]  # 允许爬取的域名

    def parse(self, response):
        # 提取每篇论文的信息
        anchors = []
        for li in response.css("div[id=dlpage] ul li"):
            anchors.append(int(li.css("a::attr(href)").get().split("item")[-1]))

        for paper in response.css("dl dt"):
            if (
                int(paper.css("a[name^='item']::attr(name)").get().split("item")[-1])
                >= anchors[-1]
            ):
                continue

            yield {
                "id": paper.css("a[title='Abstract']::attr(href)")
                .get()
                .split("/")[-1],  # 提取论文链接
            }
