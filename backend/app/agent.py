from functools import lru_cache
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from .services import retrieve, context_for, model

@tool
def search_video(question: str, video_ids: list[str]) -> str:
    """Search video transcripts for evidence, timestamps and factual answers."""
    docs = retrieve(question, video_ids)
    return context_for(docs) or "No relevant video transcript found."

@tool
def compare_videos(topic: str, video_ids: list[str]) -> str:
    """Retrieve evidence across two or more videos to compare their explanations."""
    if len(video_ids) < 2:
        return "At least two video IDs are required to compare videos."
    parts = []
    for vid in video_ids:
        parts.append(f"VIDEO {vid}\n{context_for(retrieve(topic, [vid], 5))}")
    return "\n\n".join(parts)

@tool
def navigate_video(topic: str, video_ids: list[str]) -> str:
    """Find the timestamp where a topic is explained in a video."""
    return context_for(retrieve(topic, video_ids, 4))

@lru_cache
def agent():
    return create_react_agent(model(), [search_video, compare_videos, navigate_video], checkpointer=MemorySaver(), prompt="You are VidMind, a grounded YouTube learning assistant. Always call the relevant retrieval tool before answering a video-content question. Only use retrieved transcript evidence; never fabricate details. Cite video IDs and timestamps in every substantive answer. For comparisons, represent both videos fairly. If evidence is insufficient, say so. The user can ask follow-up questions.")

def chat(question: str, video_ids: list[str], session_id: str):
    # IDs are embedded in the user turn so the agent passes them to tools.
    user_input = f"Selected video IDs: {', '.join(video_ids)}\nQuestion: {question}"
    result = agent().invoke({"messages": [("user", user_input)]}, config={"configurable": {"thread_id": session_id}, "recursion_limit": 12})
    response = result["messages"][-1].content
    return response if isinstance(response, str) else str(response)
