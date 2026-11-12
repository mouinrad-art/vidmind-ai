from functools import lru_cache
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from .core import settings

@lru_cache
def vector_store():
    cfg = settings()
    if not cfg.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return Chroma(collection_name="vidmind", embedding_function=OpenAIEmbeddings(model=cfg.embedding_model, api_key=cfg.openai_api_key), persist_directory=cfg.chroma_dir)
