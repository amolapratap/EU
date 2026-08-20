"use client";

import { useState, type ReactNode } from "react";
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import MarkdownContent from "./MarkdownContent";
import type { QuizSubmissionResponse } from "../types";

type ExamResultsProps = {
  result: QuizSubmissionResponse;
  paperTitle: string;
  onRetry?: () => void;
};

function optionLabel(index: number): string {
  return index >= 0 ? String.fromCharCode(65 + index) : "—";
}

export default function ExamResults({ result, paperTitle, onRetry }: ExamResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const passed = result.percentage >= 40;
  const unansweredCount = result.answers_detail.filter(
    (answer) => answer.user_selected_index < 0
  ).length;
  const incorrectCount = result.answers_detail.filter(
    (answer) => !answer.is_correct && answer.user_selected_index >= 0
  ).length;
  const displayDetails = showAll
    ? result.answers_detail
    : result.answers_detail.slice(0, 5);

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div
            className={`px-6 py-10 text-center text-white ${
              passed
                ? "bg-gradient-to-br from-emerald-600 to-emerald-800"
                : "bg-gradient-to-br from-[#1a365d] to-[#2d3748]"
            }`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/15 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <p className="text-sm uppercase tracking-widest opacity-80">Test Completed</p>
            <h1 className="text-2xl font-bold mt-1">{paperTitle}</h1>

            <div className="mt-6 inline-flex items-baseline gap-1">
              <span className="text-5xl font-black">{result.percentage.toFixed(1)}</span>
              <span className="text-xl opacity-80">%</span>
            </div>

            <p className="mt-2 text-lg opacity-90">
              Score: {result.score} / {result.total}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 border-t border-slate-200">
            <StatBlock
              label="Correct"
              value={result.score}
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            />
            <StatBlock
              label="Incorrect"
              value={incorrectCount}
              icon={<XCircle className="w-4 h-4 text-red-500" />}
            />
            <StatBlock
              label="Unanswered"
              value={unansweredCount}
              icon={<XCircle className="w-4 h-4 text-amber-500" />}
            />
            <StatBlock
              label="Total"
              value={result.total}
              icon={<Clock className="w-4 h-4 text-slate-500" />}
            />
          </div>
        </div>

        {/* Answer review */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Answer Review</h2>
            {result.answers_detail.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-[#2563eb] font-medium hover:underline"
              >
                {showAll ? "Show less" : `Show all (${result.answers_detail.length})`}
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {displayDetails.map((item, index) => {
              const isExpanded = expandedId === item.question_id;

              return (
                <div key={item.question_id} className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : item.question_id)
                    }
                    className="w-full text-left flex items-start gap-3"
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.is_correct
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            item.is_correct
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.is_correct ? "Correct" : "Incorrect"}
                        </span>
                        <span className="text-xs text-slate-500">
                          Your answer: {optionLabel(item.user_selected_index)}
                          {item.user_selected_index >= 0
                            ? ` · ${item.user_selected_text.slice(0, 40)}${item.user_selected_text.length > 40 ? "…" : ""}`
                            : " (Not answered)"}
                        </span>
                      </div>
                      {!isExpanded && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">
                          {item.question_text.replace(/[#*_`]/g, "").slice(0, 100)}
                        </p>
                      )}
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 ml-10 space-y-4">
                      <MarkdownContent
                        content={item.question_text}
                        className="text-sm"
                      />

                      <div className="space-y-2">
                        {item.options.map((opt, optIdx) => {
                          const isUser = optIdx === item.user_selected_index;
                          const isCorrect = optIdx === item.correct_index;

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50"
                                  : isUser
                                  ? "border-red-300 bg-red-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <span className="font-bold shrink-0">
                                {optionLabel(optIdx)}.
                              </span>
                              <MarkdownContent content={opt} />
                            </div>
                          );
                        })}
                      </div>

                      {item.explanation && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                            Explanation
                          </p>
                          <MarkdownContent
                            content={item.explanation}
                            className="text-sm text-blue-900"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retake Test
          </button>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="px-4 py-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
