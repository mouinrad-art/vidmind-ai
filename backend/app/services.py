import json
from collections import defaultdict
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI
from .core import settings, stamp
from .store import vector_store
from app.supadata_service import get_supadata_transcript

VIDEO_REGISTRY = {}  # in-memory metadata; re-ingest videos after backend restart

def model():
    cfg = settings()
    if not cfg.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return ChatOpenAI(model=cfg.openai_model, api_key=cfg.openai_api_key, temperature=0)


def fetch_transcript(video_id: str):
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    return get_supadata_transcript(video_url)


def ingest(video_id: str):
    segments = fetch_transcript(video_id)
    if not segments:
        raise ValueError("No transcript found for this video")
    chunks = []
    # Chunk by transcript segment boundaries; overlap one segment for context.
    buffer = []
    chars = 0
    for seg in segments:
        line = seg["text"].replace("\n", " ").strip()
        if not line:
            continue
        if chars + len(line) > 850 and buffer:
            start = buffer[0][0]
            chunks.append(Document(page_content=" ".join(t for _, t in buffer), metadata={"video_id": video_id, "start": start, "timestamp": stamp(start), "url": f"https://www.youtube.com/watch?v={video_id}&t={int(start)}s"}))
            buffer = buffer[-1:]
            chars = sum(len(t) for _,t in buffer)
        buffer.append((float(seg["start"]), line))
        chars += len(line)
    if buffer:
        start = buffer[0][0]
        chunks.append(Document(page_content=" ".join(t for _, t in buffer), metadata={"video_id": video_id, "start": start, "timestamp": stamp(start), "url": f"https://www.youtube.com/watch?v={video_id}&t={int(start)}s"}))
    store = vector_store()
    # Deterministic IDs make re-ingestion replace the previous chunks.
    store.add_documents(chunks, ids=[f"{video_id}-{i}" for i in range(len(chunks))])
    VIDEO_REGISTRY[video_id] = {"video_id": video_id, "chunks": len(chunks), "segments": len(segments)}
    return VIDEO_REGISTRY[video_id]

def retrieve(question: str, video_ids: list[str], k: int = 7):
    if not video_ids:
        return []
    docs = vector_store().similarity_search(question, k=max(k*3, 12), filter={"video_id": {"$in": video_ids}} if len(video_ids)>1 else {"video_id": video_ids[0]})
    return docs[:k]

def context_for(docs):
    return "\n\n".join(f"[{i+1}] Video {d.metadata['video_id']} at {d.metadata['timestamp']}: {d.page_content}" for i,d in enumerate(docs))

def citations(docs):
    return [{"video_id": d.metadata["video_id"], "timestamp": d.metadata["timestamp"], "seconds": d.metadata["start"], "url": d.metadata["url"], "excerpt": d.page_content[:220]} for d in docs]

def generate_study(video_ids: list[str], kind: str):
    if kind not in {"quiz", "flashcards", "notes"}:
        raise ValueError("kind must be quiz, flashcards or notes")
    docs = retrieve("main concepts, definitions, examples, key takeaways and conclusions", video_ids, k=12)
    if not docs:
        raise ValueError("No video content available")
    instructions = {
        "quiz": "Create five multiple-choice questions with four options each, answer keys, and short explanations.",
        "flashcards": "Create ten question/answer flashcards.",
        "notes": "Create well-structured Markdown notes with overview, main ideas, definitions, examples, and key takeaways."
    }
    answer = model().invoke([("system", "Use ONLY the supplied video excerpts. Cite timestamps like [video_id @ HH:MM:SS]. Do not invent facts."), ("human", f"{instructions[kind]}\n\n{context_for(docs)}")]).content
    return {"kind": kind, "content": answer, "citations": citations(docs)}
