"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Eraser,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import MarkdownContent from "./MarkdownContent";
import QuestionPalette, { PaletteSummary } from "./QuestionPalette";
import type { AnswerMap, PaperMeta, QuestionStatus, QuizQuestion } from "../types";

type ExamInterfaceProps = {
  paper: PaperMeta | null;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: AnswerMap;
  statuses: Record<string, QuestionStatus>;
  timeLeftSeconds: number;
  onIndexChange: (index: number) => void;
  onSelectAnswer: (questionId: string, optionIndex: number) => void;
  onClearAnswer: (questionId: string) => void;
  onToggleMark: (questionId: string) => void;
  onSubmit: () => void;
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export default function ExamInterface({
  paper,
  questions,
  currentIndex,
  answers,
  statuses,
  timeLeftSeconds,
  onIndexChange,
  onSelectAnswer,
  onClearAnswer,
  onToggleMark,
  onSubmit,
}: ExamInterfaceProps) {
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(true);

  const currentQuestion = questions[currentIndex];
  const selectedIndex = answers[currentQuestion.id];
  const isMarked = ["marked", "answered-marked"].includes(
    statuses[currentQuestion.id]
  );
  const isLowTime = timeLeftSeconds <= 300;

  const title =
    paper?.name ||
    paper?.subject_code ||
    "Objective Test";

  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] >= 0
  ).length;
  const unansweredCount = questions.length - answeredCount;

  const goPrev = () => onIndexChange(Math.max(0, currentIndex - 1));
  const goNext = () => onIndexChange(Math.min(questions.length - 1, currentIndex + 1));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-200 flex flex-col">
      {/* Top bar */}
      <header className="bg-[#1a365d] text-white shadow-md shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-blue-200">Alpha Result · CBT</p>
            <h1 className="font-semibold truncate text-sm md:text-base">{title}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right text-xs text-blue-100">
              <p>Question</p>
              <p className="font-bold text-white text-sm">
                {currentIndex + 1} / {questions.length}
              </p>
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm md:text-base ${
                isLowTime ? "bg-red-600 animate-pulse" : "bg-white/15"
              }`}
            >
              {formatTime(timeLeftSeconds)}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Submit Test
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex-1 max-w-[1600px] mx-auto w-full flex overflow-hidden">
        {/* Main question area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="w-full min-h-full">
              <div className="min-h-full bg-white border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1a365d]">
                    Question No. {currentIndex + 1}
                  </span>
                  {isMarked && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                      <Flag className="w-3 h-3" />
                      Marked for Review
                    </span>
                  )}
                </div>

                <div className="px-5 py-6 border-b border-slate-100">
                  <MarkdownContent
                    content={currentQuestion.question_md}
                    className="text-[15px] md:text-base leading-relaxed"
                  />
                </div>

                <div className="px-5 py-5 space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedIndex === index;

                    return (
                      <button
                        key={`${currentQuestion.id}-opt-${index}`}
                        type="button"
                        onClick={() => onSelectAnswer(currentQuestion.id, index)}
                        className={`
                          w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all
                          ${
                            isSelected
                              ? "border-[#2563eb] bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }
                        `}
                      >
                        <span
                          className={`
                            shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                            ${
                              isSelected
                                ? "bg-[#2563eb] text-white"
                                : "bg-slate-100 text-slate-700"
                            }
                          `}
                        >
                          {optionLabel(index)}
                        </span>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <MarkdownContent content={option} className="text-sm md:text-[15px]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="bg-white border-t border-slate-300 px-4 py-3 shrink-0">
            <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onToggleMark(currentQuestion.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isMarked
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  {isMarked ? "Unmark" : "Mark for Review"}
                </button>

                <button
                  type="button"
                  onClick={() => onClearAnswer(currentQuestion.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <Eraser className="w-4 h-4" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobilePalette(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Palette
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-medium hover:bg-[#152a4a]"
                  >
                    Save &amp; Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                  >
                    Finish Test
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Desktop navigation: keep the question controls beside the content. */}
        {showQuestionsPanel && (
          <aside className="hidden lg:block w-72 xl:w-80 bg-white border-l border-slate-300 overflow-y-auto shrink-0">
          <div className="bg-white min-h-full overflow-hidden">
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              statuses={statuses}
              onSelect={onIndexChange}
            />

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-slate-800">Your progress</h3>
                <span className="text-xs font-medium text-slate-500">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>
              <PaletteSummary questions={questions} statuses={statuses} />
            </div>
          </div>
          </aside>
        )}

        <button
          type="button"
          onClick={() => setShowQuestionsPanel((visible) => !visible)}
          className={`hidden lg:inline-flex absolute top-5 z-20 items-center justify-center w-8 h-11 rounded-l-lg border border-r-0 border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors ${
            showQuestionsPanel ? "right-72 xl:right-80" : "right-0"
          }`}
          aria-label={showQuestionsPanel ? "Hide questions panel" : "Show questions panel"}
          title={showQuestionsPanel ? "Hide questions panel" : "Show questions panel"}
        >
          {showQuestionsPanel ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Mobile palette drawer */}
      {showMobilePalette && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobilePalette(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Question Palette</h3>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <QuestionPalette
                questions={questions}
                currentIndex={currentIndex}
                statuses={statuses}
                onSelect={(i) => {
                  onIndexChange(i);
                  setShowMobilePalette(false);
                }}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Submit Test?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to submit your examination. This action cannot be undone.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{answeredCount}</p>
                <p className="text-emerald-600">Answered</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{unansweredCount}</p>
                <p className="text-red-600">Unanswered</p>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You still have {unansweredCount} unanswered question
                {unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  onSubmit();
                }}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Submit Final
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
