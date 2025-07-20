from pydantic import BaseModel, Field
from typing import Optional

class Structure(BaseModel):
    """
    定义AI需要生成的完整数据结构。
    """
    title_translation: Optional[str] = Field(default=None, description="Translate the paper's title into {language}.")
    tldr: Optional[str] = Field(default=None, description="generate a too long; didn't read summary")
    motivation: Optional[str] = Field(default=None, description="describe the motivation in this paper")
    method: Optional[str] = Field(default=None, description="method of this paper")
    result: Optional[str] = Field(default=None, description="result of this paper")
    conclusion: Optional[str] = Field(default=None, description="conclusion of this paper")
    translation: Optional[str] = Field(default=None, description="translate the abstract to Chinese")
    summary: Optional[str] = Field(default=None, description="generate a new, concise summary of the paper based on its abstract")
    keywords: Optional[str] = Field(default=None, description="Extract 3 to 5 keywords from the abstract, separated by commas.")
    # **新增**: AI点评字段
    comments: Optional[str] = Field(default=None, description="add some insightful comments about this paper, focusing on its innovation, importance, or limitations")