"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, Clock3, Hash, Loader2, LogIn } from "lucide-react";

import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/auth/AuthModal";
import ExamResults from "../../components/ExamResults";
import type { QuizResultsResponse } from "../../types";

type AttemptResultClientProps = {
  attemptId: string;
  paperMeta: {
    paper_id?: string;
    subject_name?: string;
    subject_code?: string;
    year?: string;
  };
};

function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export default function AttemptResultClient({ attemptId, paperMeta }: AttemptResultClientProps) {
  const { token, loading: authLoading } = useAuth();
  const { showLogin } = useAuthModal();
  const [result, setResult] = useState<QuizResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    apiGet(`/api/quiz/results/${attemptId}`)
      .then((data) => {
        if (!cancelled) setResult(data as QuizResultsResponse);
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message || "Unable to load this attempt.");
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId, token]);

  if (authLoading) return <LoadingState />;

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Log in to view this attempt</h1>
          <p className="mt-2 text-sm text-slate-600">Your detailed answers and score are available only to your account.</p>
          <button type="button" onClick={showLogin} className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a365d] text-white text-sm font-semibold hover:bg-[#152a4a]">
            <LogIn className="w-4 h-4" />
            Log in
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4 bg-slate-100">
        <div className="max-w-md w-full p-8 text-center bg-white rounded-2xl border border-red-200 shadow-sm">
          <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">Unable to load attempt</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Link href="/test/result" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#1a365d] hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return <LoadingState />;

  const paperTitle = paperMeta.subject_name || paperMeta.subject_code || "Previous test attempt";
  const details = [
    paperMeta.subject_code && { icon: <Hash className="w-4 h-4" />, label: "Subject code", value: paperMeta.subject_code },
    paperMeta.year && { icon: <CalendarDays className="w-4 h-4" />, label: "Year", value: paperMeta.year },
    { icon: <Clock3 className="w-4 h-4" />, label: "Time taken", value: formatDuration(result.time_taken) },
    { icon: <CalendarDays className="w-4 h-4" />, label: "Submitted", value: formatDate(result.submitted_at) },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-180px)]">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
        <Link href="/test/result" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#1a365d]">
          <ArrowLeft className="w-4 h-4" />
          All attempts
        </Link>
        <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paper details</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{paperTitle}</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {details.map((detail) => (
              <div key={detail.label} className="px-5 py-3 flex items-center gap-3">
                <span className="text-[#1a365d]">{detail.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{detail.label}</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{detail.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ExamResults result={result} paperTitle={paperTitle} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-[#1a365d] animate-spin" />
      <p className="text-sm text-slate-600">Loading attempt...</p>
    </div>
  );
}
