import scrapy

class ArxivItem(scrapy.Item):
    id = scrapy.Field()
    title = scrapy.Field()
    authors = scrapy.Field()
    summary = scrapy.Field()
    url = scrapy.Field()
    categories = scrapy.Field()
    cate = scrapy.Field()
    # **新增**: 存储从arXiv API获取的作者备注
    comment = scrapy.Field()
    date = scrapy.Field()
    updated = scrapy.Field()
    AI = scrapy.Field()