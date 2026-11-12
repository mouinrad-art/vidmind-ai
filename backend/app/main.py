from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .core import settings, video_id_from_url
from .services import ingest, generate_study, retrieve, citations, VIDEO_REGISTRY
from .agent import chat
from .quiz import make_quiz
from .auth import create_user, authenticate, token_for, current_user, remember_video, user_video_ids, check_videos

app = FastAPI(title="VidMind AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings().cors_origins.split(",")], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class AuthIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)

class RegisterIn(AuthIn):
    name: str = Field(min_length=2, max_length=100)

@app.post("/auth/register", status_code=201)
def register(data: RegisterIn):
    user = create_user(data.name, data.email, data.password)
    return {"user": user, "access_token": token_for(user), "token_type": "bearer"}

@app.post("/auth/login")
def login(data: AuthIn):
    user = authenticate(data.email, data.password)
    return {"user": user, "access_token": token_for(user), "token_type": "bearer"}

@app.get("/auth/me")
def me(user=Depends(current_user)):
    return user

class VideoIn(BaseModel):
    url: str
class QuestionIn(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    video_ids: list[str] = Field(min_length=1, max_length=10)
    session_id: str = Field(min_length=1, max_length=128)
class StudyIn(BaseModel):
    video_ids: list[str] = Field(min_length=1, max_length=10)
    kind: str
class NavigateIn(BaseModel):
    video_ids: list[str] = Field(min_length=1, max_length=10)
    topic: str

@app.get("/health")
def health():
    return {"status": "ok", "configured": bool(settings().openai_api_key)}

@app.post("/videos")
def add_video(data: VideoIn, user=Depends(current_user)):
    try:
        video_id = video_id_from_url(data.url)
        result = ingest(video_id)
        remember_video(user["id"], video_id)
        return result
    except (ValueError, RuntimeError, Exception) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

@app.get("/videos")
def videos(user=Depends(current_user)):
    return [{"video_id": vid, **VIDEO_REGISTRY.get(vid, {})} for vid in user_video_ids(user["id"])]

@app.post("/chat")
def ask(data: QuestionIn, user=Depends(current_user)):
    check_videos(user["id"], data.video_ids)
    try:
        evidence = retrieve(data.question, data.video_ids)
        return {"answer": chat(data.question, data.video_ids, data.session_id), "citations": citations(evidence)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/study")
def study(data: StudyIn, user=Depends(current_user)):
    check_videos(user["id"], data.video_ids)
    try:
        return generate_study(data.video_ids, data.kind)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/navigate")
def navigate(data: NavigateIn, user=Depends(current_user)):
    check_videos(user["id"], data.video_ids)
    try:
        return {"citations": citations(retrieve(data.topic, data.video_ids, 5))}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

class QuizIn(BaseModel):
    video_ids: list[str] = Field(min_length=1, max_length=10)
    count: int = Field(default=5, ge=3, le=10)
    difficulty: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    topic: str = Field(default="", max_length=200)

@app.post("/quiz")
def quiz(data: QuizIn, user=Depends(current_user)):
    check_videos(user["id"], data.video_ids)
    try:
        return make_quiz(data.video_ids, data.count, data.difficulty, data.topic)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
