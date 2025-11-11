from pydantic import BaseModel 

class Document(BaseModel):
    source_url: str
    title: str
    content: str
