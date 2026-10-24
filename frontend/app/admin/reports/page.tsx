"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Save,
  MessageSquare,
  Shield,
  Layers,
  ChevronRight,
  User,
  Smartphone,
  Calendar,
  XCircle,
} from "lucide-react";

export interface ReportItem {
  _id: string;
  branch: string;
  semester: string;
  subject_id: string;
  subject_code: string;
  subject_name: string;
  paper_id: string;
  paper_year: string;
  question_id?: string;
  q_no: number | string;
  sub_q_no?: string | null;
  target_type: string;
  issue_type: string;
  description: string;
  user_email?: string | null;
  user_name?: string | null;
  user_id?: string | null;
  device_info?: string;
  status: "pending" | "in_review" | "resolved" | "rejected";
  admin_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at?: string;
}

export type QuestionReport = ReportItem;

const ISSUE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  incorrect_solution: { label: "Incorrect Solution / Steps", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  wrong_option: { label: "Wrong MCQ Answer Key", color: "bg-red-500/15 text-red-300 border-red-500/30" },
  typo_math: { label: "Typo / Math Formula Error", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  broken_diagram: { label: "Missing / Broken Diagram (SVG)", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  incomplete_question: { label: "Incomplete Question", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  paper_issue: { label: "Paper / Syllabus Metadata Issue", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  other: { label: "General Feedback / Other", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

export default function ReportsAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // All reports stored in memory for 0ms client-side filtering
  const [allReports, setAllReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters (Executed in memory on frontend)
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Editing state for admin notes
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Hard Guard for admin role
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Fetch all reports once from backend
  const fetchReports = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await apiGet(`/admin/reports?limit=500`);
      if (res?.success) {
        const data: ReportItem[] = res.data || [];
        setAllReports(data);

        // Populate initial admin notes
        const notesMap: Record<string, string> = {};
        data.forEach((r: ReportItem) => {
          notesMap[r._id] = r.admin_notes || "";
        });
        setEditingNotes(notesMap);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchReports();
    }
  }, [authLoading, user, fetchReports]);

  // Client-side in-memory filter (0 network calls on tab/search changes)
  const filteredReports = useMemo(() => {
    return allReports.filter((report) => {
      // 1. Status Filter
      if (statusFilter !== "all" && report.status !== statusFilter) {
        return false;
      }
      // 2. Semester Filter
      if (semesterFilter !== "all" && String(report.semester) !== String(semesterFilter)) {
        return false;
      }
      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (report.subject_name && report.subject_name.toLowerCase().includes(q)) ||
          (report.subject_code && report.subject_code.toLowerCase().includes(q)) ||
          (report.description && report.description.toLowerCase().includes(q)) ||
          (report.issue_type && report.issue_type.toLowerCase().includes(q)) ||
          (report.paper_year && String(report.paper_year).toLowerCase().includes(q)) ||
          (report.user_email && report.user_email.toLowerCase().includes(q)) ||
          (report.target_type && report.target_type.toLowerCase().includes(q)) ||
          (report.branch && report.branch.toLowerCase().includes(q)) ||
          (report.q_no !== undefined && String(report.q_no).includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allReports, statusFilter, semesterFilter, searchQuery]);

  // Derive metric counts directly from memory
  const totalCount = allReports.length;
  const pendingCount = useMemo(() => allReports.filter((r) => r.status === "pending").length, [allReports]);
  const inReviewCount = useMemo(() => allReports.filter((r) => r.status === "in_review").length, [allReports]);
  const resolvedCount = useMemo(() => allReports.filter((r) => r.status === "resolved").length, [allReports]);

  const handleStatusChange = async (reportId: string, newStatus: ReportItem["status"]) => {
    try {
      setUpdatingId(reportId);
      await apiPut(`/admin/reports/${reportId}`, {
        status: newStatus,
        admin_notes: editingNotes[reportId] || "",
      });
      // Update locally in memory
      setAllReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (reportId: string) => {
    try {
      setUpdatingId(reportId);
      await apiPut(`/admin/reports/${reportId}`, {
        admin_notes: editingNotes[reportId] || "",
      });
      setAllReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, admin_notes: editingNotes[reportId] || "" } : r))
      );
      alert("Admin notes saved successfully.");
    } catch (err) {
      alert("Failed to save admin notes.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to permanently delete this report?")) return;
    try {
      setUpdatingId(reportId);
      await apiDelete(`/admin/reports/${reportId}`);
      setAllReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      alert("Failed to delete report.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
              <Link href="/admin" className="hover:underline">Admin Command</Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span>Feedback & Moderation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
              Feedback & Issue Reports
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Review and resolve student error reports and feedback submitted across question viewports, papers, and solutions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchReports()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/admin/papers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              Manage Papers
            </Link>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs font-medium text-slate-400">Total Reports</div>
            <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Review
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{pendingCount}</div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4">
            <div className="text-xs font-medium text-sky-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> In Review
            </div>
            <div className="text-2xl font-bold text-sky-300 mt-1">{inReviewCount}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{resolvedCount}</div>
          </div>
        </div>

        {/* Filters Toolbar (Frontend Real-time Filtering) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {["all", "pending", "in_review", "resolved", "rejected"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by subject, description, branch, or year in real-time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Semester Selector */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={String(s)}>Sem {s}</option>
            ))}
          </select>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading submitted reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl py-16 px-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Reports Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              There are no reports matching the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const issueConfig = ISSUE_TYPE_CONFIG[report.issue_type] || ISSUE_TYPE_CONFIG.other;
              const isUpdating = updatingId === report._id;

              return (
                <div
                  key={report._id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: Metadata & Details */}
                    <div className="space-y-3 flex-1">
                      {/* Address Location Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                          {report.branch || "General"} · Sem {report.semester || "-"}
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {report.subject_name} ({report.subject_code})
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {report.paper_year} Paper
                        </span>
                        {report.q_no !== undefined && (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Question {report.q_no}
                            {report.sub_q_no ? ` Part (${report.sub_q_no})` : ""}
                          </span>
                        )}
                      </div>

                      {/* Issue Category Pill */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${issueConfig.color}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {issueConfig.label}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          Target: {report.target_type || "Question"}
                        </span>
                      </div>

                      {/* User Explanation / Feedback */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed font-sans">
                        <div className="text-[10.5px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Reporter Note / Description:
                        </div>
                        {report.description}
                      </div>

                      {/* Metadata Footer: User & Time */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                        {report.user_email && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-500" /> {report.user_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-slate-500" /> {report.device_info || "Mobile App"}
                        </span>
                        {report.created_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Administrative Actions & Notes */}
                    <div className="lg:w-80 space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Moderation Status
                        </label>
                        <select
                          value={report.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(report._id, e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          <option value="pending">⏳ Pending Review</option>
                          <option value="in_review">🔍 Under Investigation</option>
                          <option value="resolved">✅ Resolved / Corrected</option>
                          <option value="rejected">❌ Rejected / Invalid</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Admin Resolution Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g., 'Corrected formula in step 3', 'Replaced corrupted SVG diagram'..."
                          value={editingNotes[report._id] || ""}
                          onChange={(e) =>
                            setEditingNotes({ ...editingNotes, [report._id]: e.target.value })
                          }
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveNotes(report._id)}
                          disabled={isUpdating}
                          className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Note
                        </button>
                      </div>

                      {/* Jump directly to Question Paper by paper_id */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        {report.paper_id ? (
                          <Link
                            href={`/admin/papers/${report.paper_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Jump to Paper Questions
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-500">No direct paper ID</span>
                        )}

                        <button
                          onClick={() => handleDelete(report._id)}
                          disabled={isUpdating}
                          title="Delete report"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
