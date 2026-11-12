# VidMind AI — YouTube Learning Assistant

A full-stack, transcript-grounded YouTube RAG application featuring **Smart Navigator**, **Learning Studio** (notes, quizzes, flashcards), **Cross-Video Intelligence**, and **Markdown Export**.

## Architecture

```text
Next.js UI -> FastAPI -> LangGraph ReAct agent (session memory)
                         |-> search_video / navigate_video / compare_videos tools
                         |-> LangChain + OpenAI embeddings -> persistent ChromaDB
YouTube URL -> youtube-transcript-api -> timestamped chunks -> ChromaDB
LangSmith tracing (optional via environment variables)
```

## Setup

Requirements: Python 3.11+, Node.js 20+, an OpenAI API key. **Never commit your `.env` files.**

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Windows: copy .env.example .env
# Edit .env and set OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs; status: http://localhost:8000/health

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. Add a YouTube URL with available captions, ask a question, use the Navigator, generate a quiz, or add a second video and ask for a comparison.

## Deploy

- **Frontend:** Import `frontend` as the Vercel root directory. Set `NEXT_PUBLIC_API_URL` to your public backend HTTPS URL. Deploy.
- **Backend:** Deploy `backend` as a Python web service on Render, Railway, Fly.io, or a persistent VM. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `OPENAI_API_KEY`, `CORS_ORIGINS=https://YOUR-VERCEL-DOMAIN`, and `CHROMA_DIR` to a mounted persistent disk path. Use a single worker for local Chroma storage.
- Set `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, and `LANGSMITH_PROJECT=vidmind-ai` on the backend to enable tracing. LangSmith evaluations should use a labeled QA dataset and check groundedness, correctness, citation accuracy, and latency.

## Important limitations / next steps

- This MVP uses YouTube captions; audio fallback with Whisper is **not implemented**. Some videos may have unavailable, disabled, or blocked transcripts. Only process content you are authorized to access.
- It is **transcript-based**, not visual frame understanding. The video player displays YouTube content; the model answers from captions.
- `MemorySaver` stores chat state only while the backend process runs. Use a durable LangGraph checkpointer for production.
- Chroma persists indexed chunks on disk, but the video registry is in-memory and resets on restart. A production version should persist metadata in PostgreSQL and add authentication, rate limiting, request size caps, retries, and background ingestion jobs.
- Current answers include agent-generated timestamp references and retrieved evidence buttons; citation correctness still requires evaluation.
- The `/study` endpoint retrieves representative chunks rather than every transcript chunk; long-video coverage is approximate.
- The app does not fine-tune an LLM; it uses retrieval-augmented generation instead.
- Dependency versions use compatible ranges; lock versions after a successful install for reproducible deployments.

## Evaluation rubric

Create a dataset of at least 20 manually verified video QA pairs across multiple videos. Track exact/semantic answer correctness, faithfulness to transcript, timestamp precision (within 30 seconds), retrieval recall@5, p50/p95 latency, and cost per question. Record baseline and improved results in LangSmith. Do not report fabricated scores.

## Endpoints

- `GET /health` — readiness/config status
- `POST /videos` — ingest video `{ "url": "..." }`
- `GET /videos` — current-process registry
- `POST /chat` — `{ "question": "...", "video_ids": ["..."], "session_id": "..." }`
- `POST /navigate` — `{ "topic": "...", "video_ids": ["..."] }`
- `POST /study` — `{ "kind": "notes|quiz|flashcards", "video_ids": ["..."] }`

## Account registration and login (new)

- The frontend opens with a responsive **Log in / Register** screen.
- Register with a name, email and password (minimum 10 characters), then sign in with your credentials.
- The backend exposes `POST /auth/register`, `POST /auth/login`, and authenticated `GET /auth/me`.
- Passwords use salted PBKDF2-SHA256 (600,000 iterations). Signed JWT access tokens expire after 24 hours.
- Existing video, chat, study, navigation, and quiz endpoints now require a bearer token.
- User-video associations are stored in SQLite, so each user sees their own saved video IDs. The transcript/vector index is still shared internally; for strict tenant isolation, add user metadata filtering to ChromaDB and LangGraph session namespaces before a public multi-tenant launch.
- Account and user-video metadata are stored at `AUTH_DB_PATH`, default `./auth_data/users.sqlite3`.

**Required backend `.env` additions:**

```dotenv
JWT_SECRET=your-strong-random-secret-at-least-32-characters
AUTH_DB_PATH=./auth_data/users.sqlite3
```

Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

**Deployment:** configure `JWT_SECRET` in Render environment variables and mount a persistent disk for both `AUTH_DB_PATH` and `CHROMA_DIR`. SQLite needs a single persistent backend instance; use managed PostgreSQL for horizontally scaled production. The frontend still uses `NEXT_PUBLIC_API_URL`. Tokens are currently stored in browser localStorage for this prototype; production authentication should prefer secure HttpOnly cookies, CSRF controls, rate limiting, email verification, and password reset.
