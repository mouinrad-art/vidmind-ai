# Project III — VidMind AI

## Business value
VidMind helps students, educators, and professionals search and study video content faster through transcript-grounded question answering, timestamp navigation, cross-video comparison, and reusable study materials.

## Objectives and mapping
1. QA: LangChain OpenAI model with Chroma retrieval and LangGraph agent.
2. Speech recognition: stretch goal; caption retrieval is MVP, Whisper fallback requires an authorized audio pipeline.
3. Conversational UI: Next.js chat with session memory.
4. Video vector retrieval: transcript ingestion with timestamp metadata into ChromaDB.
5. Evaluation: pytest smoke tests, plus a proposed LangSmith evaluation dataset and metrics.
6. Agents/tools/memory: ReAct agent, three retrieval tools, MemorySaver.
7. Deployment: Vercel frontend + hosted FastAPI backend.

## Seven-day plan
- Days 1–2: ingestion, chunking, embedding and vector retrieval.
- Days 3–4: LangGraph agent, tool calling, conversation memory, comparison.
- Days 5–6: responsive frontend, study tools, timestamp navigation and deployment.
- Day 7: QA dataset, LangSmith evaluations, documentation and presentation.

## Presentation outline (8 slides)
1. The problem: video is difficult to search and review.
2. Solution: VidMind AI and its four differentiators.
3. Live demo: ingest video and ask a question.
4. Architecture: Next.js → FastAPI → LangGraph → ChromaDB.
5. Agent tools, memory and grounded citations.
6. Learning studio and cross-video comparison demo.
7. Evaluation methodology and real measured results (fill after testing).
8. Limitations, roadmap and business impact.

## Risks and mitigations
- Captions may be unavailable: explain error and add authorized Whisper fallback later.
- Hallucinations: retrieval-only prompting, timestamps and groundedness evaluation.
- Long videos: representative retrieval may omit details; add hierarchical summaries later.
- Cost: use smaller LLM and embeddings; monitor traces and token usage.
- Persistence: use durable vector and checkpoint stores in production.
