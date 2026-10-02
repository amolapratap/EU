"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenCheck, CalendarDays, ClipboardList, FileText, Hash, Loader2, Play, Search } from "lucide-react";

import { apiGet } from "@/lib/api";
import type { QuizPaperListResponse } from "./types";
import AppPromoBanner from "@/components/app-promo/AppPromoBanner";

export default function TestLandingPage() {
  const [search, setSearch] = useState("");
  const [papers, setPapers] = useState<QuizPaperListResponse["papers"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = (await apiGet(
          `/api/quiz/papers?search=${encodeURIComponent(search)}`
        )) as QuizPaperListResponse;
        if (!cancelled) setPapers(response.papers);
      } catch (requestError: any) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load available test papers.");
          setPapers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <div className="min-h-[calc(100vh-180px)] bg-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-[#1a365d] to-[#274e80] px-6 py-8 md:px-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-white/10">
                <BookOpenCheck className="w-6 h-6" />
              </div>
              <h1 className="mt-4 text-2xl md:text-3xl font-bold">Objective tests</h1>
              <p className="mt-2 text-sm md:text-base text-blue-100">
                Select a paper with objective questions, then start your computer-based test.
              </p>
            </div>
            <Link href="/test/result" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#1a365d] hover:bg-blue-50">
              <ClipboardList className="w-4 h-4" />
              Your results
            </Link>
          </div>
        </section>

        <AppPromoBanner context="test" variant="compact" />

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <label htmlFor="paper-search" className="block text-sm font-semibold text-slate-800">Find a test paper</label>
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="paper-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by subject name or subject code"
                className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/15"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#1a365d]" />
              <p className="text-sm text-slate-500">Loading available test papers...</p>
            </div>
          ) : error ? (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : papers.length === 0 ? (
            <div className="py-16 px-5 text-center">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <h2 className="mt-3 font-semibold text-slate-700">No objective test papers found</h2>
              <p className="mt-1 text-sm text-slate-500">Try a different subject name or code.</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 bg-slate-50">
              {papers.map((paper) => (
                <article key={paper.paper_id} className="flex flex-col bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900 leading-snug">{paper.name || "Untitled paper"}</h2>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1a365d]">
                        <Hash className="w-3.5 h-3.5" />
                        {paper.subject_code || "No subject code"}
                      </p>
                    </div>
                    {paper.year && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {paper.year}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    {paper.type && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{paper.type}</span>}
                    {paper.paper_type && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 capitalize">{paper.paper_type}</span>}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">{paper.objective_questions} questions</span>
                  </div>

                  <Link href={`/test/${paper.paper_id}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a365d] py-2.5 text-sm font-semibold text-white hover:bg-[#152a4a]">
                    <Play className="w-4 h-4" />
                    Start test
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
