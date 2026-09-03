"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import {
  ArrowLeft,
  History,
  RotateCcw,
  Check,
  Calendar,
  User,
  FileText,
  Layers,
  Table as TableIcon,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import BlogRenderer from "@/components/blog/BlogRenderer";

interface RevisionItem {
  _id: string;
  blog_id: string;
  version: number;
  snapshot: any;
  updated_by: string;
  updated_by_id?: string;
  change_summary?: string;
  created_at: string;
}

export default function BlogRevisionsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, loading } = useAuth();

  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [previewRevision, setPreviewRevision] = useState<RevisionItem | null>(null);

  // 🔐 Role Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "superalpha") || !id) return;
    loadRevisions();
  }, [user, loading, id]);

  async function loadRevisions() {
    try {
      setFetching(true);
      const res = await apiGet(`/admin/blog/${id}/revisions`);
      if (res?.success) {
        setRevisions(res.data || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load revisions");
    } finally {
      setFetching(false);
    }
  }

  async function handleRestore(version: number) {
    if (
      !confirm(
        `Are you sure you want to restore Version ${version}? This will overwrite the current content with Version ${version}'s snapshot and log it as a new version.`
      )
    ) {
      return;
    }

    try {
      setRestoringVersion(version);
      const res = await apiPost(`/admin/blog/${id}/revisions/${version}/restore`, {});
      if (res?.success) {
        toast.success(`Successfully rolled back to Version ${version}!`);
        await loadRevisions();
        router.push(`/admin/blog/${id}/edit`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to restore revision");
    } finally {
      setRestoringVersion(null);
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-slate-300">
        Loading revision history...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ===== TOP BAR ===== */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/blog/${id}/edit`}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Revision History
              </h1>
              <p className="text-xs text-slate-400">
                Audit every change made to this post, inspect past snapshots, and restore any previous version
              </p>
            </div>
          </div>

          <Link
            href={`/admin/blog/${id}/edit`}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 text-slate-300 transition"
          >
            Back to Editor
          </Link>
        </div>

        {/* ===== REVISION TIMELINE ===== */}
        {revisions.length === 0 ? (
          <div className="bg-[#11172C] border border-white/10 rounded-xl p-10 text-center text-xs text-slate-400">
            No revisions found for this post.
          </div>
        ) : (
          <div className="space-y-4">
            {revisions.map((rev, idx) => {
              const isLatest = idx === 0;
              const dateStr = rev.created_at
                ? new Date(rev.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Unknown date";

              return (
                <div
                  key={rev._id}
                  className={`bg-[#11172C] border rounded-xl p-5 transition ${
                    isLatest
                      ? "border-indigo-500/50 shadow-md shadow-indigo-950/40"
                      : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                            isLatest
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          Version {rev.version}
                        </span>

                        {isLatest && (
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Current Active Version
                          </span>
                        )}

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {dateStr}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white pt-1">
                        {rev.snapshot?.title || "Untitled Post"}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          {rev.updated_by || "Admin"}
                        </span>

                        {rev.change_summary && (
                          <span className="text-indigo-300 italic">
                            &quot;{rev.change_summary}&quot;
                          </span>
                        )}

                        {rev.snapshot?.tables && rev.snapshot.tables.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <TableIcon className="w-3 h-3 text-indigo-400" />
                            {rev.snapshot.tables.length} {rev.snapshot.tables.length === 1 ? "table" : "tables"}
                          </span>
                        )}

                        {rev.snapshot?.sub_topics && rev.snapshot.sub_topics.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Layers className="w-3 h-3 text-purple-400" />
                            {rev.snapshot.sub_topics.length} sections
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setPreviewRevision(rev)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>

                      {!isLatest && (
                        <button
                          type="button"
                          onClick={() => handleRestore(rev.version)}
                          disabled={restoringVersion === rev.version}
                          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {restoringVersion === rev.version ? "Restoring..." : "Restore This"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== PREVIEW MODAL ===== */}
        {previewRevision && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative shadow-2xl">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-800">
                      Snapshot: Version {previewRevision.version}
                    </span>
                    <span className="text-xs text-slate-500">
                      Saved by {previewRevision.updated_by}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {previewRevision.snapshot?.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewRevision(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {previewRevision.snapshot?.excerpt && (
                <p className="text-sm text-slate-600 italic">
                  {previewRevision.snapshot.excerpt}
                </p>
              )}

              <BlogRenderer
                blocks={previewRevision.snapshot?.blocks}
                content={previewRevision.snapshot?.content}
                alertBox={previewRevision.snapshot?.alert_box}
                tables={previewRevision.snapshot?.tables}
                subTopics={previewRevision.snapshot?.sub_topics}
              />

              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Logged note: &quot;{previewRevision.change_summary || "No note"}&quot;
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewRevision(null)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ver = previewRevision.version;
                      setPreviewRevision(null);
                      handleRestore(ver);
                    }}
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Restore Version {previewRevision.version}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
