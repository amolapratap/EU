"use client";

import { Clock, AlertTriangle, BookOpen, Monitor } from "lucide-react";
import type { PaperMeta } from "../types";

type ExamInstructionsProps = {
  paper: PaperMeta | null;
  totalQuestions: number;
  durationMinutes: number;
  onStart: () => void;
};

export default function ExamInstructions({
  paper,
  totalQuestions,
  durationMinutes,
  onStart,
}: ExamInstructionsProps) {
  const title =
    paper?.name ||
    paper?.subject_code ||
    "Objective Examination";

  const subtitle = [
    paper?.exam_type,
    paper?.year ? `Session ${paper.year}` : null,
    paper?.paper_type,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-[#1a365d] text-white px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-blue-100 text-sm md:text-base">{subtitle}</p>
            )}
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-blue-200">
              Computer Based Test
            </p>
          </div>

          <div className="px-6 py-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-[#1a365d]">{totalQuestions}</p>
                <p className="text-sm text-slate-600 mt-1">Questions</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-[#1a365d]">{durationMinutes}</p>
                <p className="text-sm text-slate-600 mt-1">Minutes</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-[#1a365d]">MCQ</p>
                <p className="text-sm text-slate-600 mt-1">Objective Type</p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 space-y-1">
                <p className="font-semibold">Important Instructions</p>
                <ul className="list-disc pl-4 space-y-1 text-amber-800">
                  <li>Each question carries equal marks. There is no negative marking unless stated otherwise.</li>
                  <li>Click an option to select your answer. You can change your answer before final submission.</li>
                  <li>Use &quot;Mark for Review&quot; to revisit a question later.</li>
                  <li>The timer will start once you begin the test. Submit before time runs out.</li>
                  <li>Login is required to submit your test and view your score.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                General Guidelines
              </h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
                <li>Read each question carefully before selecting an option.</li>
                <li>Use the question palette on the left to jump between questions.</li>
                <li>Green indicates answered, purple indicates marked for review.</li>
                <li>Review all questions before clicking &quot;Submit Test&quot;.</li>
                <li>Do not refresh or close the browser during the examination.</li>
              </ol>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-2">
              <Clock className="w-4 h-4" />
              <span>Duration: {durationMinutes} minutes · {totalQuestions} questions</span>
            </div>

            <button
              onClick={onStart}
              className="w-full py-3.5 rounded-lg bg-[#1a365d] hover:bg-[#152a4a] text-white font-semibold text-lg transition-colors shadow-md"
            >
              I am ready to begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
