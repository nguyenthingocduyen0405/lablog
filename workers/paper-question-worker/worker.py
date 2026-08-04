from __future__ import annotations

import json
import logging
import os
import signal
import socket
import time
import urllib.error
import urllib.request
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel


class LocalizedText(BaseModel):
    ko: str
    vi: str
    en: str


class PaperQuestion(BaseModel):
    id: str
    difficulty: Literal["easy", "medium", "hard"]
    section: str
    question: LocalizedText
    options: list[LocalizedText]
    answer_index: int
    explanation: LocalizedText
    source_page: int | None
    source_excerpt: str


class PaperQuestionSet(BaseModel):
    summary: LocalizedText
    questions: list[PaperQuestion]


PROMPT = """Create a study quiz using only the attached research paper.

Success criteria:
- Produce exactly 10 multiple-choice questions: 3 easy, 4 medium, and 3 hard.
- Every question has exactly four plausible options and one correct answer.
- Cover the paper's motivation, method, results, limitations, and conclusions.
- Avoid trivia, ambiguous wording, and knowledge not supported by the paper.
- Provide faithful Korean, Vietnamese, and English versions of every question,
  option, explanation, and the overall paper summary.
- Use a stable id from q1 through q10.
- Include the best source page and a short source excerpt when the paper makes
  them available. Use null for source_page and an empty source_excerpt when a
  reliable citation cannot be established.

Paper title: {paper_title}
"""


class SupabaseRpcClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.base_url = url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def call(self, function_name: str, payload: dict[str, object]) -> object:
        request = urllib.request.Request(
            f"{self.base_url}/rest/v1/rpc/{function_name}",
            data=json.dumps(payload).encode("utf-8"),
            headers=self.headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Supabase RPC {function_name} failed with HTTP {error.code}: {detail[:500]}"
            ) from error
        return json.loads(body) if body else None


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def validate_question_set(question_set: PaperQuestionSet) -> dict[str, object]:
    if len(question_set.questions) != 10:
        raise ValueError("The model must return exactly 10 questions.")
    difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
    for index, question in enumerate(question_set.questions, start=1):
        if len(question.options) != 4:
            raise ValueError(f"Question {index} must contain exactly four options.")
        if question.answer_index not in range(4):
            raise ValueError(f"Question {index} has an invalid answer index.")
        question.id = f"q{index}"
        difficulty_counts[question.difficulty] += 1
    if difficulty_counts != {"easy": 3, "medium": 4, "hard": 3}:
        raise ValueError("The question set must contain a 3/4/3 difficulty mix.")
    return question_set.model_dump(mode="json")


def generate_questions(
    client: OpenAI,
    model: str,
    paper_title: str,
    paper_url: str,
) -> tuple[str, dict[str, object]]:
    response = client.responses.parse(
        model=model,
        reasoning={"effort": os.getenv("OPENAI_QUESTION_REASONING", "low")},
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": PROMPT.format(paper_title=paper_title),
                    },
                    {"type": "input_file", "file_url": paper_url},
                ],
            }
        ],
        text_format=PaperQuestionSet,
        max_output_tokens=12_000,
        store=False,
    )
    if response.output_parsed is None:
        raise RuntimeError("OpenAI returned no parsed question set.")
    return response.model, validate_question_set(response.output_parsed)


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    logger = logging.getLogger("paper-question-worker")
    supabase = SupabaseRpcClient(
        require_env("SUPABASE_URL"),
        require_env("SUPABASE_SERVICE_ROLE_KEY"),
    )
    openai = OpenAI(api_key=require_env("OPENAI_API_KEY"))
    model = os.getenv("OPENAI_QUESTION_MODEL", "gpt-5.6-terra").strip()
    worker_name = os.getenv(
        "AI_WORKER_NAME", f"{socket.gethostname()}-{os.getpid()}"
    ).strip()
    poll_seconds = max(2.0, float(os.getenv("AI_POLL_SECONDS", "5")))
    stopping = False

    def stop(_signum: int, _frame: object) -> None:
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    logger.info("Worker %s started with model %s", worker_name, model)

    while not stopping:
        try:
            claimed = supabase.call(
                "claim_paper_question_job", {"worker_name": worker_name}
            )
            jobs = claimed if isinstance(claimed, list) else []
            if not jobs:
                time.sleep(poll_seconds)
                continue
            job = jobs[0]
            job_id = str(job["job_id"])
            logger.info("Processing job %s for paper %s", job_id, job["paper_id"])
            try:
                actual_model, payload = generate_questions(
                    openai,
                    model,
                    str(job["paper_title"]),
                    str(job["paper_url"]),
                )
                supabase.call(
                    "complete_paper_question_job",
                    {
                        "target_job_id": job_id,
                        "generated_model": actual_model,
                        "generated_payload": payload,
                    },
                )
                logger.info("Completed job %s", job_id)
            except Exception as error:
                logger.exception("Job %s failed", job_id)
                supabase.call(
                    "fail_paper_question_job",
                    {
                        "target_job_id": job_id,
                        "failure_message": str(error)[:2000],
                        "attempted_model": model,
                    },
                )
        except Exception:
            logger.exception("Worker loop failed")
            time.sleep(max(10.0, poll_seconds))

    logger.info("Worker stopped")


if __name__ == "__main__":
    main()
