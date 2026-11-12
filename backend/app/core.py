import os
import re
from functools import lru_cache
from urllib.parse import urlparse, parse_qs
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"
    cors_origins: str = "http://localhost:3000"
    chroma_dir: str = "./chroma_data"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache
def settings():
    return Settings()

def video_id_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}:
        vid = parse_qs(parsed.query).get("v", [""])[0]
        if not vid and parsed.path.startswith(("/shorts/", "/live/", "/embed/")):
            vid = parsed.path.split("/")[2]
    elif host == "youtu.be":
        vid = parsed.path.strip("/").split("/")[0]
    else:
        raise ValueError("Enter a YouTube video URL")
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid):
        raise ValueError("Invalid YouTube video ID")
    return vid

def stamp(seconds: float) -> str:
    n = int(seconds)
    return f"{n//3600:02d}:{(n%3600)//60:02d}:{n%60:02d}"
