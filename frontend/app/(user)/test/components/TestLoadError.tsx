"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Compass,
  FileQuestion,
  Hash,
  Loader2,
  Play,
  SearchX,
} from "lucide-react";

import { apiGet } from "@/lib/api";
import type { QuizPaperListItem, QuizPaperListResponse, QuizPaperMeta } from "../types";

export type TestLoadErrorKind = "invalid-id" | "not-found" | "no-objective" | "generic";

type TestLoadErrorProps = {
  kind: TestLoadErrorKind;
  paperId: string;
  message?: string;
  paper?: QuizPaperMeta | null;
};

const ERROR_COPY: Record<
  TestLoadErrorKind,
  { title: string; description: string; icon: typeof AlertCircle }
> = {
  "invalid-id": {
    title: "Invalid paper ID",
    description:
      "The link uses a paper ID that is not valid. Paper IDs are 24-character MongoDB identifiers (letters and numbers only).",
    icon: SearchX,
  },
  "not-found": {
    title: "Paper not found",
    description:
      "No paper exists in the database for this ID. It may have been removed, or the link could be outdated or mistyped.",
    icon: FileQuestion,
  },
  "no-objective": {
    title: "No objective questions available",
    description:
      "This paper was found, but it does not contain any multiple-choice (objective) questions suitable for the CBT test mode. You can still view solutions on the PYQ page.",
    icon: BookOpenCheck,
  },
  generic: {
    title: "Unable to load test",
    description:
      "Something went wrong while loading this examination. Please try again or pick another paper from the test catalog.",
    icon: AlertCircle,
  },
};

function classifyLoadError(error: unknown): {
  kind: TestLoadErrorKind;
  message?: string;
  paper?: QuizPaperMeta | null;
} {
  if (error && typeof error === "object") {
    const err = error as Error & { status?: number; code?: TestLoadErrorKind; paper?: QuizPaperMeta };

    if (err.code) {
      return { kind: err.code, message: err.message, paper: err.paper ?? null };
    }

    const detail = err.message?.toLowerCase() ?? "";
    if (detail.includes("invalid paper id")) return { kind: "invalid-id", message: err.message };
    if (detail.includes("not found")) return { kind: "not-found", message: err.message };
    if (detail.includes("no objective")) return { kind: "no-objective", message: err.message };
  }

  return {
    kind: "generic",
    message: error instanceof Error ? error.message : undefined,
  };
}

export { classifyLoadError };

export default function TestLoadError({ kind, paperId, message, paper }: TestLoadErrorProps) {
  const copy = ERROR_COPY[kind];
  const Icon = copy.icon;

  const [suggestions, setSuggestions] = useState<QuizPaperListItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      setLoadingSuggestions(true);
      try {
        const search = paper?.subject_code || "";
        const response = (await apiGet(
          `/api/quiz/papers?search=${encodeURIComponent(search)}&limit=6`
        )) as QuizPaperListResponse;

        if (cancelled) return;

        const filtered = response.papers.filter((item) => item.paper_id !== paperId);
        setSuggestions(filtered.slice(0, 4));
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [paper?.subject_code, paperId]);

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main error card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className={`px-6 py-8 text-center ${
              kind === "no-objective"
                ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                : "bg-gradient-to-br from-red-500 to-rose-700 text-white"
            }`}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-4">
              <Icon className="w-7 h-7" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold">{copy.title}</h1>
            <p className="mt-2 text-sm opacity-90 max-w-md mx-auto">{copy.description}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested paper ID
              </p>
              <p className="mt-1 font-mono text-slate-800 break-all">{paperId}</p>
            </div>

            {paper && kind === "no-objective" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-amber-900">Paper details</p>
                {paper.name && <p className="text-amber-800">{paper.name}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-amber-700">
                  {paper.subject_code && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5">
                      <Hash className="w-3 h-3" />
                      {paper.subject_code}
                    </span>
                  )}
                  {paper.year && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5">
                      <CalendarDays className="w-3 h-3" />
                      {paper.year}
                    </span>
                  )}
                  {paper.type && (
                    <span className="rounded bg-amber-100 px-2 py-0.5">{paper.type}</span>
                  )}
                </div>
              </div>
            )}

            {message && kind === "generic" && (
              <p className="text-sm text-slate-600 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                {message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/test"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1a365d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#152a4a] transition-colors"
              >
                <Compass className="w-4 h-4" />
                Explore available tests
              </Link>
              <Link
                href="/pyq/download"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to PYQs
              </Link>
            </div>
          </div>
        </div>

        {/* Suggested papers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">
              {paper?.subject_code
                ? `Other tests for ${paper.subject_code}`
                : "Suggested tests you can try"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Papers with objective MCQ questions ready for exam mode
            </p>
          </div>

          {loadingSuggestions ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#1a365d]" />
              <p className="text-xs text-slate-500">Finding available tests...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-10 px-5 text-center">
              <p className="text-sm text-slate-600">No other matching tests right now.</p>
              <Link
                href="/test"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
              >
                Browse full test catalog
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suggestions.map((item) => (
                <li key={item.paper_id}>
                  <Link
                    href={`/test/${item.paper_id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate group-hover:text-[#1a365d]">
                        {item.name || "Untitled paper"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.subject_code}
                        {item.year ? ` · ${item.year}` : ""}
                        {item.type ? ` · ${item.type}` : ""}
                        {" · "}
                        {item.objective_questions} MCQs
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold group-hover:bg-emerald-100">
                      <Play className="w-3 h-3" />
                      Start
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loadingSuggestions && suggestions.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/test"
                className="text-sm font-medium text-[#2563eb] hover:underline"
              >
                View all available tests →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
