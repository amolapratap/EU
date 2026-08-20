"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/auth/AuthModal";

import ExamInstructions from "../components/ExamInstructions";
import ExamInterface from "../components/ExamInterface";
import ExamResults from "../components/ExamResults";
import TestLoadError, { classifyLoadError, type TestLoadErrorKind } from "../components/TestLoadError";
import { fetchQuizQuestions, QuizLoadError } from "../lib/fetchQuizQuestions";
import type {
  AnswerMap,
  ExamPhase,
  PaperMeta,
  QuestionStatus,
  QuizQuestion,
  QuizSubmissionResponse,
  QuizPaperMeta,
} from "../types";

type TestExamClientProps = {
  paperId: string;
};

function computeDurationMinutes(totalQuestions: number, override?: number | null): number {
  if (override && override > 0) return override;
  return Math.max(15, Math.ceil(totalQuestions * 1.5));
}

function buildStatuses(
  questions: QuizQuestion[],
  answers: AnswerMap,
  visited: Set<string>,
  marked: Set<string>
): Record<string, QuestionStatus> {
  const map: Record<string, QuestionStatus> = {};

  for (const q of questions) {
    if (marked.has(q.id) && answers[q.id] !== undefined && answers[q.id] >= 0) {
      map[q.id] = "answered-marked";
    } else if (marked.has(q.id)) {
      map[q.id] = "marked";
    } else if (answers[q.id] !== undefined && answers[q.id] >= 0) {
      map[q.id] = "answered";
    } else if (visited.has(q.id)) {
      map[q.id] = "not-answered";
    } else {
      map[q.id] = "not-visited";
    }
  }

  return map;
}

export default function TestExamClient({ paperId }: TestExamClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const durationOverride = searchParams.get("duration")
    ? Number(searchParams.get("duration"))
    : null;

  const { token, loading: authLoading } = useAuth();
  const { showLogin } = useAuthModal();

  const [phase, setPhase] = useState<ExamPhase>("loading");
  const [paper, setPaper] = useState<PaperMeta | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadError, setLoadError] = useState<{
    kind: TestLoadErrorKind;
    message?: string;
    paper?: QuizPaperMeta | null;
  } | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [marked, setMarked] = useState<Set<string>>(new Set());

  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [result, setResult] = useState<QuizSubmissionResponse | null>(null);
  const pendingSubmitRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const examStartedRef = useRef(false);

  const storageKey = `exam-${paperId}`;

  const statuses = useMemo(
    () => buildStatuses(questions, answers, visited, marked),
    [questions, answers, visited, marked]
  );

  const paperTitle =
    paper?.name || paper?.subject_code || "Objective Examination";

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPhase("loading");
      setLoadError(null);

      try {
        const quizData = await fetchQuizQuestions(paperId);

        if (cancelled) return;

        setQuestions(quizData.questions);
        setPaper({
          _id: quizData.paper.id,
          name: quizData.paper.name,
          subject_code: quizData.paper.subject_code,
          year: quizData.paper.year,
          exam_type: quizData.paper.exam_type,
          paper_type: quizData.paper.paper_type,
          type: quizData.paper.type,
        });
        setDurationMinutes(
          computeDurationMinutes(quizData.total_questions, durationOverride)
        );

        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.answers) setAnswers(parsed.answers);
            if (parsed.marked) setMarked(new Set(parsed.marked));
            if (parsed.visited) setVisited(new Set(parsed.visited));
            if (typeof parsed.currentIndex === "number") {
              setCurrentIndex(parsed.currentIndex);
            }
          } catch {
            /* ignore corrupt session */
          }
        }

        setPhase("instructions");
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof QuizLoadError) {
            setLoadError({
              kind: err.code,
              message: err.message,
              paper: err.paper ?? null,
            });
          } else {
            setLoadError(classifyLoadError(err));
          }
          setPhase("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [paperId, durationOverride, storageKey]);

  /* ---------------- PERSIST SESSION ---------------- */
  useEffect(() => {
    if (phase !== "exam" && phase !== "instructions") return;

    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        answers,
        marked: Array.from(marked),
        visited: Array.from(visited),
        currentIndex,
      })
    );
  }, [answers, marked, visited, currentIndex, phase, storageKey]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (phase !== "exam") return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast.warning("Time is up! Submitting your test...");
          handleSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  /* ---------------- BEFORE UNLOAD ---------------- */
  useEffect(() => {
    if (phase !== "exam") return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  /* ---------------- MARK VISITED ON INDEX CHANGE ---------------- */
  useEffect(() => {
    if (phase !== "exam" || !questions[currentIndex]) return;

    setVisited((prev) => {
      const next = new Set(prev);
      next.add(questions[currentIndex].id);
      return next;
    });
  }, [currentIndex, phase, questions]);

  const handleStart = () => {
    setTimeLeftSeconds(durationMinutes * 60);
    setElapsedSeconds(0);
    examStartedRef.current = true;

    if (questions[0]) {
      setVisited((prev) => {
        const next = new Set(prev);
        next.add(questions[0].id);
        return next;
      });
    }

    setPhase("exam");
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleClearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleToggleMark = (questionId: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const submitTest = useCallback(async () => {
    setPhase("submitting");

    const payload = {
      paper_id: paperId,
      time_taken: elapsedSeconds,
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_index: answers[q.id] ?? -1,
      })),
    };

    try {
      const res = (await apiPost("/api/quiz/submit", payload)) as QuizSubmissionResponse;
      sessionStorage.removeItem(storageKey);
      setResult(res);
      toast.success("Test submitted successfully!");
      const detailParams = new URLSearchParams({
        paper_id: paperId,
        subject_name: paper?.name || "",
        subject_code: paper?.subject_code || "",
      });
      if (paper?.year) detailParams.set("year", String(paper.year));
      router.replace(`/test/result/${res.attempt_id}?${detailParams.toString()}`);
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
      setPhase("exam");
    }
  }, [paperId, elapsedSeconds, questions, answers, storageKey, paper, router]);

  const handleSubmitRef = useRef<(auto?: boolean) => void>(() => {});

  handleSubmitRef.current = (auto = false) => {
    if (!token) {
      pendingSubmitRef.current = true;
      if (!auto) toast.info("Please login to submit your test");
      showLogin();
      return;
    }
    submitTest();
  };

  const handleSubmit = () => handleSubmitRef.current(false);

  /* Resume submit after login */
  useEffect(() => {
    if (token && pendingSubmitRef.current && phase === "exam") {
      pendingSubmitRef.current = false;
      submitTest();
    }
  }, [token, phase, submitTest]);

  const handleRetry = () => {
    setAnswers({});
    setVisited(new Set());
    setMarked(new Set());
    setCurrentIndex(0);
    setResult(null);
    setElapsedSeconds(0);
    sessionStorage.removeItem(storageKey);
    setPhase("instructions");
  };

  /* ---------------- RENDER ---------------- */

  if (phase === "error" && loadError) {
    return (
      <TestLoadError
        kind={loadError.kind}
        paperId={paperId}
        message={loadError.message}
        paper={loadError.paper}
      />
    );
  }

  if (phase === "loading" || authLoading) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#1a365d] animate-spin" />
        <p className="text-sm text-slate-600">Loading examination...</p>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <ExamInstructions
        paper={paper}
        totalQuestions={questions.length}
        durationMinutes={durationMinutes}
        onStart={handleStart}
      />
    );
  }

  if (phase === "results" && result) {
    return (
      <ExamResults
        result={result}
        paperTitle={paperTitle}
        onRetry={handleRetry}
      />
    );
  }

  if (phase === "submitting") {
    return (
      <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-600">Evaluating your responses...</p>
      </div>
    );
  }

  return (
    <ExamInterface
      paper={paper}
      questions={questions}
      currentIndex={currentIndex}
      answers={answers}
      statuses={statuses}
      timeLeftSeconds={timeLeftSeconds}
      onIndexChange={setCurrentIndex}
      onSelectAnswer={handleSelectAnswer}
      onClearAnswer={handleClearAnswer}
      onToggleMark={handleToggleMark}
      onSubmit={handleSubmit}
    />
  );
}
