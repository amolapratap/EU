"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Eye,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Tag,
  Layers,
  Table as TableIcon,
} from "lucide-react";
import { API_URL } from "@/lib/api";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image?: string;
  category: string;
  tags?: string[];
  views: number;
  published_at?: string;
  created_at: string;
  created_by?: string;
}

const CATEGORIES = [
  "All",
  "Exam",
  "Result",
  "Syllabus",
  "News",
  "College",
  "Guide",
];

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadBlogs();
  }, [category, activeSearch, page]);

  async function loadBlogs() {
    try {
      setFetching(true);
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (activeSearch.trim()) params.append("search", activeSearch.trim());
      params.append("page", page.toString());
      params.append("limit", "9");

      const res = await fetch(`${API_URL}/api/public/blog?${params.toString()}`);
      const data = await res.json();
      if (data?.success) {
        setBlogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load blogs:", err);
    } finally {
      setFetching(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search);
  }

  function getCategoryColor(cat: string) {
    const map: Record<string, string> = {
      Exam: "bg-red-50 text-red-700 border-red-200",
      Result: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Syllabus: "bg-purple-50 text-purple-700 border-purple-200",
      News: "bg-blue-50 text-blue-700 border-blue-200",
      College: "bg-amber-50 text-amber-700 border-amber-200",
      Guide: "bg-teal-50 text-teal-700 border-teal-200",
    };
    return map[cat] || "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return (
    <div className="min-h-screen pb-16">
      {/* ===== HERO HEADER ===== */}
      <section className="bg-gradient-to-b from-indigo-50/70 via-white to-transparent border-b border-slate-200/70 pt-10 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100/80 text-indigo-800 border border-indigo-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            BEU Academic Updates & News
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Campus News, Exam Routines & Syllabus
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Stay informed with verified Bihar Engineering University updates, exam datesheets,
            result notices, syllabus revisions, and student preparation guides.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-lg mx-auto flex items-center bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden p-1.5 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition"
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search exam dates, syllabus, notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 flex-wrap pt-3">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== POSTS GRID ===== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        {fetching ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Articles Found</h3>
            <p className="text-xs text-slate-500">
              No published articles match your search or filter criteria. Check back soon for new updates!
            </p>
            {(category !== "All" || activeSearch) && (
              <button
                onClick={() => {
                  setCategory("All");
                  setActiveSearch("");
                  setSearch("");
                }}
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((post) => {
                const dateStr = post.published_at
                  ? new Date(post.published_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;

                return (
                  <Link
                    key={post._id}
                    href={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Cover image or gradient header */}
                    {post.cover_image ? (
                      <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e: any) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span
                          className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-xs ${getCategoryColor(
                            post.category
                          )}`}
                        >
                          {post.category || "General"}
                        </span>
                      </div>
                    ) : (
                      <div className="h-28 w-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-4 flex items-start justify-between border-b border-slate-100">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-xs ${getCategoryColor(
                            post.category
                          )}`}
                        >
                          {post.category || "General"}
                        </span>
                        <BookOpen className="w-5 h-5 text-indigo-400 opacity-60" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 leading-snug">
                          {post.title}
                        </h2>

                        {post.excerpt && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                      </div>

                      {/* Footer meta */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-2.5">
                          {dateStr && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {dateStr}
                            </span>
                          )}
                        </div>

                        <span className="flex items-center gap-0.5 font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {total > 9 && (
              <div className="flex items-center justify-center gap-3 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {Math.ceil(total / 9)}
                </span>
                <button
                  disabled={page >= Math.ceil(total / 9)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
