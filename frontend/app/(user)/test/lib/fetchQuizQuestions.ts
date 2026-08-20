import { API_URL } from "@/lib/api";
import type { QuizPaperMeta, QuizQuestionsResponse } from "../types";
import type { TestLoadErrorKind } from "../components/TestLoadError";

export class QuizLoadError extends Error {
  status?: number;
  code: TestLoadErrorKind;
  paper?: QuizPaperMeta | null;

  constructor(
    message: string,
    code: TestLoadErrorKind,
    options?: { status?: number; paper?: QuizPaperMeta | null }
  ) {
    super(message);
    this.name = "QuizLoadError";
    this.code = code;
    this.status = options?.status;
    this.paper = options?.paper ?? null;
  }
}

export async function fetchQuizQuestions(paperId: string): Promise<QuizQuestionsResponse> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}/api/quiz/questions/${paperId}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = (json.detail || json.message || "Unable to load test") as string;
    const lower = detail.toLowerCase();

    if (res.status === 400 || lower.includes("invalid paper id")) {
      throw new QuizLoadError(detail, "invalid-id", { status: res.status });
    }

    if (res.status === 404 || lower.includes("not found")) {
      throw new QuizLoadError(detail, "not-found", { status: res.status });
    }

    throw new QuizLoadError(detail, "generic", { status: res.status });
  }

  const data = json as QuizQuestionsResponse;

  if (!data.questions?.length) {
    throw new QuizLoadError(
      "This paper has no objective MCQ questions available for test mode.",
      "no-objective",
      { paper: data.paper ?? null }
    );
  }

  return data;
}
