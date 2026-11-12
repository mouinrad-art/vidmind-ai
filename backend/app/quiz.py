from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from .services import retrieve, context_for, model

class QuizQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str
    video_id: str
    timestamp_seconds: int = Field(ge=0)

class QuizPayload(BaseModel):
    questions: list[QuizQuestion]

def make_quiz(video_ids: list[str], count: int, difficulty: str, topic: str):
    docs = retrieve(topic or 'main concepts definitions examples and key takeaways', video_ids, k=18)
    if not docs:
        raise ValueError('No indexed transcript content found. Add a video first.')
    evidence = '\n'.join(f'{d.metadata["video_id"]} | {int(d.metadata["start"])} seconds | {d.page_content}' for d in docs)
    prompt = (f'Create exactly {count} distinct {difficulty} multiple-choice questions on the topic {topic or "the main video concepts"}. '
              'Use ONLY the provided transcript excerpts. Every question must have exactly four plausible options, one correct index (0-3), '
              'a helpful explanation, and a source video_id and timestamp_seconds taken EXACTLY from a provided excerpt. '
              'Do not make up timestamps or facts. Avoid ambiguous questions and duplicate answers. '
              'Return structured output.\n\nTRANSCRIPT EXCERPTS:\n'+evidence)
    result = model().with_structured_output(QuizPayload).invoke(prompt)
    if len(result.questions) != count:
        raise ValueError('The AI returned an incomplete quiz. Please retry.')
    allowed = {(d.metadata['video_id'],int(d.metadata['start'])) for d in docs}
    for q in result.questions:
        if (q.video_id,q.timestamp_seconds) not in allowed:
            raise ValueError('The AI returned an unverified timestamp. Please retry.')
    return result.model_dump()
