import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles, Timer } from "lucide-react";

type McqTestPromoBannerProps = {
  variant?: "banner" | "compact" | "strip";
  className?: string;
};

export default function McqTestPromoBanner({
  variant = "banner",
  className = "",
}: McqTestPromoBannerProps) {
  if (variant === "compact") {
    return (
      <Link
        href="/test"
        className={`group block rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 hover:border-emerald-300 hover:shadow-sm transition-all ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
              New: MCQ Test Mode
              <span className="text-[10px] uppercase tracking-wide bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                CBT
              </span>
            </p>
            <p className="text-xs text-emerald-800/80 mt-0.5">
              Attempt objective papers in a competitive exam-style interface with timer and instant results.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    );
  }

  if (variant === "strip") {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm text-emerald-900">
          <ClipboardList className="w-4 h-4 shrink-0" />
          <span>
            <strong>MCQ Test Mode</strong> — practice objective questions like a real CBT exam.
          </span>
        </div>
        <Link
          href="/test"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shrink-0"
        >
          Start a test
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-[#1a365d] via-[#1e4976] to-emerald-800 text-white shadow-lg ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
            <Sparkles className="w-3.5 h-3.5" />
            New feature
          </span>
          <h2 className="mt-3 text-xl md:text-2xl font-bold">
            Objective MCQ Test Mode
          </h2>
          <p className="mt-2 text-sm md:text-base text-blue-100 leading-relaxed">
            Take previous year objective papers in a professional computer-based test environment —
            question palette, timer, mark for review, and instant score after submission.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-emerald-100">
            <span className="inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Timed exams
            </span>
            <span className="inline-flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              Instant evaluation
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            href="/test"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1a365d] hover:bg-emerald-50 transition-colors"
          >
            Browse all tests
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/test/result"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20 transition-colors"
          >
            View my results
          </Link>
        </div>
      </div>
    </section>
  );
}
