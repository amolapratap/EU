"use client";

import type { QuestionStatus, QuizQuestion } from "../types";

type QuestionPaletteProps = {
  questions: QuizQuestion[];
  currentIndex: number;
  statuses: Record<string, QuestionStatus>;
  onSelect: (index: number) => void;
  compact?: boolean;
};

function statusClasses(status: QuestionStatus, isCurrent: boolean): string {
  if (isCurrent) {
    return "bg-[#2563eb] text-white border-[#2563eb] ring-2 ring-blue-300";
  }

  switch (status) {
    case "answered":
      return "bg-emerald-500 text-white border-emerald-500";
    case "answered-marked":
      return "bg-violet-500 text-white border-violet-500";
    case "marked":
      return "bg-violet-500 text-white border-violet-500";
    case "not-answered":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-white text-slate-700 border-slate-300 hover:border-slate-400";
  }
}

function statusLabel(status: QuestionStatus): string {
  return status.replace("-", " ");
}

export default function QuestionPalette({
  questions,
  currentIndex,
  statuses,
  onSelect,
  compact = false,
}: QuestionPaletteProps) {
  return (
    <div className={compact ? "" : "flex flex-col"}>
      {!compact && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Questions</h3>
        </div>
      )}

      <div
        className={`grid grid-cols-5 gap-2 ${
          compact ? "p-2" : "p-4"
        }`}
      >
        {questions.map((q, index) => {
          const status = statuses[q.id] || "not-visited";
          const isCurrent = index === currentIndex;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(index)}
              className={`
                relative w-full aspect-square min-w-[36px] rounded-md border text-sm font-semibold
                transition-all duration-150
                ${statusClasses(status, isCurrent)}
              `}
              aria-label={`Question ${index + 1}, ${statusLabel(status)}${
                isCurrent ? ", current question" : ""
              }`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {index + 1}
              {status === "answered-marked" && (
                <span className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <LegendItem color="bg-emerald-500" label="Answered" />
            <LegendItem color="bg-violet-500" label="Marked" />
            <LegendItem color="bg-violet-500" dot label="Answered & Marked" />
            <LegendItem color="bg-red-100 border border-red-300" label="Not Answered" />
            <LegendItem color="bg-white border border-slate-300" label="Not Visited" />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
  dot = false,
}: {
  color: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`relative w-4 h-4 rounded-sm ${color}`}>
        {dot && <span className="absolute -right-1 -bottom-1 w-2 h-2 rounded-full bg-emerald-500 border border-white" />}
      </span>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

export function PaletteSummary({
  questions,
  statuses,
}: {
  questions: QuizQuestion[];
  statuses: Record<string, QuestionStatus>;
}) {
  const counts = questions.reduce(
    (acc, q) => {
      const s = statuses[q.id] || "not-visited";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <SummaryItem label="Answered" value={counts.answered || 0} color="text-emerald-600" />
      <SummaryItem label="Marked" value={counts.marked || 0} color="text-violet-600" />
      <SummaryItem
        label="Answered & Marked"
        value={counts["answered-marked"] || 0}
        color="text-violet-600"
        className="col-span-2"
      />
      <SummaryItem label="Not Answered" value={counts["not-answered"] || 0} color="text-red-600" />
      <SummaryItem label="Not Visited" value={counts["not-visited"] || 0} color="text-slate-600" />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  color,
  className = "",
}: {
  label: string;
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-between bg-white rounded px-2 py-1.5 border border-slate-200 ${className}`}>
      <span className="text-slate-600">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
