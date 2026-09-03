"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet, apiDelete } from "@/lib/api";
import {
  Plus,
  Search,
  Eye,
  Edit,
  History,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  Sparkles,
  Layers,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";

interface AdminBlogItem {
  _id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  version: number;
  views: number;
  updated_at: string;
  created_by?: string;
  sub_topics?: any[];
  tables?: any[];
}

export default function AdminBlogListPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [blogs, setBlogs] = useState<AdminBlogItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 🔐 HARD ROLE GUARD
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superalpha")) return;
    loadBlogs();
  }, [user, loading, category, status]);

  async function loadBlogs() {
    try {
      setFetching(true);
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (status !== "All") params.append("status", status);
      if (search.trim()) params.append("search", search.trim());

      const res = await apiGet(`/admin/blog?${params.toString()}`);
      if (res?.success) {
        setBlogs(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load blogs");
    } finally {
      setFetching(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This will also remove all its revision history.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await apiDelete(`/admin/blog/${id}`);
      toast.success("Blog deleted successfully");
      setBlogs((prev) => prev.filter((b) => b._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete blog");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-slate-300">
        Authenticating admin session...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

  const categories = ["All", "Exam", "Result", "Syllabus", "News", "College", "Guide", "General"];
  const statuses = ["All", "published", "draft"];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ===== TOP BAR ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Admin Control
              </span>
              <span className="text-xs text-slate-400">• Role: {user.role}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Blogs & Academic News
            </h1>
            <p className="text-xs text-slate-400">
              Manage student news, syllabus changes, exam alerts, dynamic tables, and revision history
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs px-3.5 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 transition"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/admin/blog/new"
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </Link>
          </div>
        </div>

        {/* ===== FILTERS & SEARCH ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#11172C] p-4 rounded-xl border border-white/10">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search posts by title or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadBlogs()}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0B0F1A] border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0B0F1A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#0B0F1A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== BLOG TABLE ===== */}
        <div className="bg-[#11172C] border border-white/10 rounded-xl overflow-hidden shadow-xs">
          {fetching ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading posts...
            </div>
          ) : blogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No posts found</p>
              <p className="text-xs text-slate-500">
                Create your first blog post or adjust your filters above.
              </p>
              <Link
                href="/admin/blog/new"
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Create Post Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#151D33] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3">Title & Slug</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-3 py-3 text-center">Version</th>
                    <th className="px-3 py-3 text-center">Views</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blogs.map((b) => (
                    <tr key={b._id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3.5 max-w-sm">
                        <p className="font-medium text-white truncate hover:text-indigo-300 transition">
                          {b.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 truncate">
                            /{b.slug}
                          </span>
                          {b.tables && b.tables.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <TableIcon className="w-2.5 h-2.5" />
                              {b.tables.length} {b.tables.length === 1 ? "table" : "tables"}
                            </span>
                          )}
                          {b.sub_topics && b.sub_topics.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Layers className="w-2.5 h-2.5" />
                              {b.sub_topics.length} sections
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {b.category || "General"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {b.status === "published" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
                          v{b.version || 1}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Eye className="w-3 h-3 text-slate-500" />
                          {b.views || 0}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {b.updated_at ? new Date(b.updated_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : "-"}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {b.status === "published" && (
                            <Link
                              href={`/blog/${b.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
                              title="View Public Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          <Link
                            href={`/admin/blog/${b._id}/revisions`}
                            className="p-1.5 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                            title="Revision History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/blog/${b._id}/edit`}
                            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition"
                            title="Edit Post"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(b._id, b.title)}
                            disabled={deletingId === b._id}
                            className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
