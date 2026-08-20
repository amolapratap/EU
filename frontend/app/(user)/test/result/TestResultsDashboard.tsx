"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock3,
  ClipboardList,
  Loader2,
  LogIn,
  Trophy,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/auth/AuthModal";
import { apiGet } from "@/lib/api";
import type { QuizAttempt, QuizHistoryResponse, QuizStatisticsResponse } from "../types";

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

type SubjectAttemptGroup = {
  subjectCode: string;
  subjectName: string;
  attempts: QuizAttempt[];
};

function groupAttemptsBySubject(attempts: QuizAttempt[]): SubjectAttemptGroup[] {
  const groups = new Map<string, SubjectAttemptGroup>();

  attempts.forEach((attempt) => {
    const subjectCode = attempt.subject_code || "Unspecified subject";
    const key = subjectCode.toLowerCase();
    const existing = groups.get(key);

    if (existing) {
      existing.attempts.push(attempt);
      return;
    }

    groups.set(key, {
      subjectCode,
      subjectName: attempt.subject_name || subjectCode,
      attempts: [attempt],
    });
  });

  return Array.from(groups.values());
}

export default function TestResultsDashboard() {
  const { token, loading: authLoading } = useAuth();
  const { showLogin } = useAuthModal();
  const [history, setHistory] = useState<QuizHistoryResponse | null>(null);
  const [statistics, setStatistics] = useState<QuizStatisticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiGet("/api/quiz/history") as Promise<QuizHistoryResponse>,
      apiGet("/api/quiz/statistics") as Promise<QuizStatisticsResponse>,
    ])
      .then(([historyData, statisticsData]) => {
        if (cancelled) return;
        setHistory(historyData);
        setStatistics(statisticsData);
      })
      .catch((requestError: Error) => {
        if (!cancelled) setError(requestError.message || "Unable to load your test results.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authLoading) {
    return <LoadingState label="Checking your account..." />;
  }

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-180px)] bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-[#1a365d] flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Your test results</h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in to view your performance summary and previous test attempts.
          </p>
          <button
            type="button"
            onClick={showLogin}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a365d] text-white text-sm font-semibold hover:bg-[#152a4a]"
          >
            <LogIn className="w-4 h-4" />
            Log in to continue
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState label="Loading your test results..." />;

  const subjectGroups = groupAttemptsBySubject(history?.attempts || []);

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/test" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#1a365d]">
              <ArrowLeft className="w-4 h-4" />
              Back to tests
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Your test results</h1>
            <p className="mt-1 text-sm text-slate-600">Track your overall progress and revisit completed attempts.</p>
          </div>
          <Link href="/test" className="shrink-0 px-3 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-semibold hover:bg-[#152a4a]">
            Take a test
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric icon={<ClipboardList className="w-4 h-4" />} label="Attempts" value={statistics?.total_attempts ?? 0} />
              <Metric icon={<BarChart3 className="w-4 h-4" />} label="Average score" value={`${statistics?.average_percentage ?? 0}%`} />
              <Metric icon={<Trophy className="w-4 h-4" />} label="Best score" value={`${statistics?.best_score ?? 0}%`} />
              <Metric icon={<Clock3 className="w-4 h-4" />} label="Time spent" value={formatDuration(statistics?.total_time_spent ?? 0)} />
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Previous attempts</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {history?.total_attempts ?? 0} completed test{history?.total_attempts === 1 ? "" : "s"} across {subjectGroups.length} subject{subjectGroups.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {!history?.attempts.length ? (
                <div className="px-5 py-12 text-center">
                  <ClipboardList className="w-9 h-9 mx-auto text-slate-300" />
                  <p className="mt-3 font-medium text-slate-700">No completed tests yet</p>
                  <p className="mt-1 text-sm text-slate-500">Your submitted attempts will appear here.</p>
                </div>
              ) : (
                <div className="p-4 space-y-4 bg-slate-50">
                  {subjectGroups.map((group) => (
                    <div key={group.subjectCode} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate">{group.subjectName}</h3>
                          <p className="mt-0.5 text-xs font-medium text-[#1a365d]">{group.subjectCode}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1a365d]">
                          {group.attempts.length} attempt{group.attempts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {group.attempts.map((attempt, attemptIndex) => (
                          <Link
                            key={attempt.attempt_id}
                            href={`/test/result/${attempt.attempt_id}?subject_name=${encodeURIComponent(group.subjectName)}&subject_code=${encodeURIComponent(group.subjectCode)}${attempt.year ? `&year=${attempt.year}` : ""}`}
                            className="group px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="w-10 h-10 shrink-0 rounded-full bg-blue-50 text-[#1a365d] flex items-center justify-center font-bold text-sm">
                              {attempt.percentage.toFixed(0)}%
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-slate-800">
                                  Attempt #{group.attempts.length - attemptIndex} · {formatDate(attempt.submitted_at)}
                                </p>
                                {attempt.year && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                    Year {attempt.year}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">Time taken: {formatDuration(attempt.time_taken)}</p>
                            </div>
                            <div className="hidden sm:block text-right">
                              <p className="font-semibold text-slate-800">{attempt.score} / {attempt.total}</p>
                              <p className="text-xs text-slate-500">Score</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1a365d]" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-[#1a365d] animate-spin" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
        <span className="text-[#1a365d]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
