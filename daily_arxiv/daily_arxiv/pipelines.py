from itemadapter import ItemAdapter
from scrapy.exceptions import DropItem
import arxiv
import os

class ArxivPipeline:

    def __init__(self):
        # 初始化客户端，并设置礼貌的抓取延迟和重试次数
        self.client = arxiv.Client(
            page_size = 100,
            #delay_seconds = 3,
            #num_retries = 5
            delay_seconds = 3,  # 显式地将API请求延迟设置为3秒
            num_retries = 5     # 建议也取消注释重试次数，增加健壮性
        )
        self.preference = os.environ.get('CATEGORIES', 'cs.CV, cs.CL').split(',')
        self.preference = list(map(lambda x: x.strip(), self.preference))

    def process_item(self, item, spider):
        try:
            search = arxiv.Search(id_list=[item["id"]])
            result = next(self.client.results(search), None)
            
            if result:
                item["title"] = result.title
                item["authors"] = [author.name for author in result.authors]
                item["summary"] = result.summary
                # **新增**: 提取并保存arXiv官方的comment字段
                item["comment"] = result.comment
                # **新增**: 提取并保存arXiv官方的PDF链接
                item["pdf_url"] = result.pdf_url
                # **新增**: 提取并保存arXiv官方的categories字段
                item["categories"] = result.categories
                item["cate"] = result.primary_category
                # 使用PDF链接作为URL，更直接
                # 转换为abs链接
                item["url"] = result.pdf_url.replace('arxiv.org/pdf/', 'arxiv.org/abs/') 
                item["date"] = result.published.date().isoformat() if result.published else None
                item["updated"] = result.updated.date().isoformat() if result.updated else None
                return item
            else:
                raise DropItem(f"Paper with ID {item['id']} not found on arXiv.")

        except Exception as e:
            spider.logger.error(f"Failed to process paper {item['id']}: {e}")
            raise DropItem(f"Failed to process paper {item['id']} due to an error.")