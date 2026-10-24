"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import {
  GraduationCap,
  BookOpen,
  FileText,
  Inbox,
  Newspaper,
  Layers,
  ExternalLink,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Sparkles,
  Clock,
  Plus,
  FolderGit2,
  FileUp,
  BarChart3,
  Search,
  Server,
  Database,
  ArrowUpRight,
} from "lucide-react";

/* =====================================================
   ADMIN DASHBOARD / COMMAND CENTER
===================================================== */

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Metrics State
  const [semCount, setSemCount] = useState<number | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);
  const [pendingReportCount, setPendingReportCount] = useState<number | null>(null);
  const [blogCount, setBlogCount] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // 🔐 Hard Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Fetch all dashboard metrics
  const fetchAllStats = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "superalpha")) return;

    setRefreshing(true);
    try {
      await Promise.allSettled([
        apiGet("/admin/ssb/semester/count")
          .then(res => setSemCount(typeof res?.data === "number" ? res.data : null))
          .catch(() => setSemCount(null)),

        apiGet("/admin/ssb/branch/count")
          .then(res => setBranchCount(typeof res?.data === "number" ? res.data : null))
          .catch(() => setBranchCount(null)),

        apiGet("/admin/ssb/subject/count")
          .then(res => setSubjectCount(typeof res?.data === "number" ? res.data : null))
          .catch(() => setSubjectCount(null)),

        apiGet("/admin/ssb/papers/count")
          .then(res => setPaperCount(typeof res?.data === "number" ? res.data : null))
          .catch(() => setPaperCount(null)),

        apiGet("/admin/missing_papers?status=under_review&limit=1")
          .then(res => setPendingReviewCount(typeof res?.pagination?.total === "number" ? res.pagination.total : 0))
          .catch(() => setPendingReviewCount(null)),

        apiGet("/admin/reports?status=pending&limit=1")
          .then(res => setPendingReportCount(typeof res?.pending_count === "number" ? res.pending_count : (typeof res?.total === "number" ? res.total : 0)))
          .catch(() => setPendingReportCount(null)),

        apiGet("/admin/blog?limit=1")
          .then(res => {
            if (typeof res?.total === "number") setBlogCount(res.total);
            else if (Array.isArray(res?.data)) setBlogCount(res.data.length);
            else setBlogCount(null);
          })
          .catch(() => setBlogCount(null)),
      ]);

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user && (user.role === "admin" || user.role === "superalpha")) {
      fetchAllStats();
    }
  }, [loading, user, fetchAllStats]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300 gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
          <Shield size={20} />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-400">Loading Admin Command Center...</p>
      </div>
    );
  }

  // Extra safety guard
  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

  const isSuperAlpha = user?.role === "superalpha";

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[300px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none" />

      {/* ================= TOP NAV / BRAND BAR ================= */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* LOGO & TITLE */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Alpha<span className="text-indigo-400">Result</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  {isSuperAlpha ? "Super Alpha" : "Admin Panel"}
                </span>
                {user?.admin_userid && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-indigo-300" title="Your Admin ID">
                    ID: {user.admin_userid}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                University Examination & Curriculum Command Center
              </p>
            </div>
          </div>

          {/* ACTIONS: LIVE SITE, REFRESH, LOGOUT */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition cursor-pointer"
              title="Open public website in a new tab"
            >
              <span>Live Site</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={fetchAllStats}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition disabled:opacity-50 cursor-pointer"
              title="Refresh dashboard metrics"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-indigo-400" : ""} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/25 transition cursor-pointer"
              title="Log out of admin session"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 relative z-10">
        {/* HERO WELCOME BANNER */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0E1526]/90 to-slate-900/90 border border-slate-800/90 shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Production System Active</span>
                {lastUpdated && <span className="text-slate-500 text-[10px]">• Synced at {lastUpdated}</span>}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex flex-wrap items-center gap-3">
                <span>
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-100 bg-clip-text text-transparent">
                    {user?.name || user?.email?.split("@")[0] || "Administrator"}
                  </span>
                </span>
                {user?.admin_userid && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                    <span className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">Admin ID:</span>
                    {user.admin_userid}
                  </span>
                )}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Manage university degree curriculums, organize semester question papers with partial PDF extraction, review student-submitted contributions, and publish academic bulletins.
              </p>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/admin/papers"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition active:scale-95"
              >
                <Plus size={14} />
                <span>Upload Paper</span>
              </Link>

              <Link
                href="/admin/ssb"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition active:scale-95"
              >
                <FolderGit2 size={14} className="text-indigo-400" />
                <span>Structure (SSB)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ================= METRICS STATS GRID ================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-400" />
              <span>Platform Core Metrics</span>
            </h2>
            <span className="text-[11px] text-slate-500">Live database counts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5 sm:gap-4">
            <MetricCard
              title="Semesters"
              value={semCount}
              subtitle="Registered terms"
              icon={GraduationCap}
              href="/admin/ssb"
              accentColor="indigo"
            />
            <MetricCard
              title="Branches"
              value={branchCount}
              subtitle="Engg disciplines"
              icon={FolderGit2}
              href="/admin/ssb"
              accentColor="purple"
            />
            <MetricCard
              title="Subjects"
              value={subjectCount}
              subtitle="Course syllabi"
              icon={BookOpen}
              href="/admin/ssb"
              accentColor="emerald"
            />
            <MetricCard
              title="Exam Papers"
              value={paperCount}
              subtitle="Cataloged files"
              icon={FileText}
              href="/admin/papers"
              accentColor="sky"
            />
            <MetricCard
              title="Review Queue"
              value={pendingReviewCount}
              subtitle={pendingReviewCount && pendingReviewCount > 0 ? "Pending review" : "Queue clear"}
              icon={Inbox}
              href="/admin/missing-papers"
              accentColor="amber"
              badge={pendingReviewCount && pendingReviewCount > 0 ? `${pendingReviewCount} pending` : undefined}
            />
            <MetricCard
              title="Issue Reports"
              value={pendingReportCount}
              subtitle={pendingReportCount && pendingReportCount > 0 ? "Pending fixes" : "All clean"}
              icon={AlertTriangle}
              href="/admin/reports"
              accentColor="rose"
              badge={pendingReportCount && pendingReportCount > 0 ? `${pendingReportCount} open` : undefined}
            />
            <MetricCard
              title="Articles"
              value={blogCount}
              subtitle="Blogs & updates"
              icon={Newspaper}
              href="/admin/blog"
              accentColor="rose"
            />
          </div>
        </section>

        {/* ================= CORE MODULES (ACTION HUB) ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                <span>Management Modules</span>
              </h2>
              <p className="text-xs text-slate-400">Direct gateways to all administration services</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* MODULE 1: CURRICULUM (SSB) */}
            <ModuleCard
              title="Curriculum & Structure"
              badge="SSB MODULE"
              description="Configure semester levels, engineering branches (codes & abbreviations), course subjects (Theory/Practical), elective clusters, and chapter-wise syllabus modules."
              icon={GraduationCap}
              href="/admin/ssb"
              theme="indigo"
              tags={["Semesters", "Branches", "Subjects", "Electives", "Syllabus"]}
              primaryActionLabel="Open Structure Manager"
              secondaryActionLabel="Subject Syllabi"
              secondaryActionHref="/admin/ssb"
            />

            {/* MODULE 2: QUESTION PAPERS */}
            <ModuleCard
              title="Question Papers Repository"
              badge="EXAM ARCHIVES"
              description="Browse, upload, and update university exam papers (End-Sem, Mid-Sem, Regular, Special, Supplementary). Extract selective PDF pages, merge drag-and-drop images, and compress files."
              icon={FileText}
              href="/admin/papers"
              theme="purple"
              tags={["PDF Uploader", "Page Selector", "Image Merge", "Auto-Generate"]}
              primaryActionLabel="Manage Papers"
              secondaryActionLabel="Upload Paper"
              secondaryActionHref="/admin/papers"
            />

            {/* MODULE 3: MISSING PAPERS REVIEW */}
            <ModuleCard
              title="Missing Papers Moderation"
              badge="STUDENT UPLOADS"
              description="Review question papers uploaded by students. Inspect university metadata, preview PDF files in-browser, and approve directly to Cloudinary or reject with reasons."
              icon={Inbox}
              href="/admin/missing-papers"
              theme="amber"
              tags={["Under Review", "PDF Preview", "One-Click Approve", "Rejections"]}
              primaryActionLabel="Open Review Queue"
              secondaryActionLabel="Approved Archive"
              secondaryActionHref="/admin/missing-papers"
              alert={pendingReviewCount && pendingReviewCount > 0 ? `${pendingReviewCount} student submissions waiting for your review` : undefined}
            />

            {/* MODULE 4: FEEDBACK & ISSUE REPORTS */}
            <ModuleCard
              title="Feedback & Issue Reports"
              badge="MODERATION"
              description="Track, investigate, and resolve feedback and error reports submitted by students directly from the mobile app across questions, solutions, papers, and features."
              icon={AlertTriangle}
              href="/admin/reports"
              theme="purple"
              tags={["Feedback", "Question Issues", "LaTeX Corrections", "Diagrams"]}
              primaryActionLabel="Review Reports"
              alert={pendingReportCount && pendingReportCount > 0 ? `${pendingReportCount} reports awaiting review` : undefined}
            />

            {/* MODULE 5: BLOGS & EDITORIAL */}
            <ModuleCard
              title="Blogs & University News"
              badge="EDITORIAL DESK"
              description="Author, publish, and schedule student announcements, study strategies, examination timetables, and academic notices with rich markdown and revision rollback."
              icon={Newspaper}
              href="/admin/blog"
              theme="emerald"
              tags={["Rich Markdown", "Categories", "Revision History", "Drafts"]}
              primaryActionLabel="All Articles"
              secondaryActionLabel="New Post"
              secondaryActionHref="/admin/blog/new"
            />

            {/* MODULE 5: PDF SERVICE & UTILITIES */}
            <ModuleCard
              title="PDF Processing Tools"
              badge="MICROSERVICE"
              description="Process and brand raw exam question papers directly via the Alpha Result PDF microservice with dynamic university watermark headers and footers."
              icon={Layers}
              href="/admin/pdf"
              theme="sky"
              tags={["Auto-Branding", "Watermarking", "Sanitization", "Download"]}
              primaryActionLabel="Open PDF Tool"
            />

            {/* MODULE 6: QUICK SYSTEM INFORMATION */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                    <Server size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                    INFRASTRUCTURE
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">System & Storage Health</h3>
                  <p className="text-xs text-slate-400 mt-1">Platform microservices status and security profile.</p>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Database size={13} className="text-emerald-400" />
                      <span>MongoDB Database</span>
                    </span>
                    <span className="text-emerald-400 font-mono font-semibold">Connected</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-400" />
                      <span>Cloudinary CDN</span>
                    </span>
                    <span className="text-indigo-300 font-mono font-semibold">Active</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Shield size={13} className="text-purple-400" />
                      <span>Admin Access Level</span>
                    </span>
                    <span className="text-purple-300 font-mono font-bold uppercase">{user?.role || "Admin"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-500">
                <span>Alpha Result v2.4</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>All systems operational</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= QUICK SHORTCUTS STRIP ================= */}
        <section className="bg-gradient-to-r from-[#0C1222] via-[#0F162B] to-[#0C1222] rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>Quick Operations & Shortcuts</span>
              </h3>
              <p className="text-xs text-slate-400">Frequently used shortcuts to speed up daily administrative duties</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/papers"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition"
              >
                <Plus size={12} className="text-indigo-400" />
                <span>New Paper</span>
              </Link>

              <Link
                href="/admin/ssb"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition"
              >
                <Plus size={12} className="text-purple-400" />
                <span>New Subject</span>
              </Link>

              <Link
                href="/admin/blog/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition"
              >
                <Plus size={12} className="text-emerald-400" />
                <span>Write Article</span>
              </Link>

              <Link
                href="/admin/missing-papers"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition"
              >
                <Inbox size={12} className="text-amber-400" />
                <span>Review Submissions</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* =====================================================
   HELPER SUB-COMPONENTS
===================================================== */

interface MetricCardProps {
  title: string;
  value: number | null;
  subtitle: string;
  icon: any;
  href: string;
  accentColor: "indigo" | "purple" | "emerald" | "sky" | "amber" | "rose";
  badge?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, href, accentColor, badge }: MetricCardProps) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "hover:border-indigo-500/40",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "hover:border-purple-500/40",
      text: "text-purple-400",
      dot: "bg-purple-400",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "hover:border-emerald-500/40",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    sky: {
      bg: "bg-sky-500/10",
      border: "hover:border-sky-500/40",
      text: "text-sky-400",
      dot: "bg-sky-400",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "hover:border-amber-500/40",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    rose: {
      bg: "bg-rose-500/10",
      border: "hover:border-rose-500/40",
      text: "text-rose-400",
      dot: "bg-rose-400",
    },
  }[accentColor];

  return (
    <Link
      href={href}
      className={`group bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${colorMap.border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg ${colorMap.bg} ${colorMap.text}`}>
          <Icon size={15} />
        </div>
      </div>

      <div className="my-2.5">
        <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
          {value === null ? (
            <span className="text-slate-600 animate-pulse text-xl">...</span>
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{subtitle}</span>
        {badge ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {badge}
          </span>
        ) : (
          <ArrowUpRight size={13} className="text-slate-600 group-hover:text-slate-300 transition" />
        )}
      </div>
    </Link>
  );
}

interface ModuleCardProps {
  title: string;
  badge: string;
  description: string;
  icon: any;
  href: string;
  theme: "indigo" | "purple" | "emerald" | "amber" | "sky";
  tags: string[];
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  alert?: string;
}

function ModuleCard({
  title,
  badge,
  description,
  icon: Icon,
  href,
  theme,
  tags,
  primaryActionLabel,
  secondaryActionLabel,
  secondaryActionHref,
  alert,
}: ModuleCardProps) {
  const themeStyles = {
    indigo: {
      badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      iconBox: "bg-indigo-500/15 border-indigo-500/25 text-indigo-400",
      hoverBorder: "hover:border-indigo-500/40",
      btnPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20",
    },
    purple: {
      badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      iconBox: "bg-purple-500/15 border-purple-500/25 text-purple-400",
      hoverBorder: "hover:border-purple-500/40",
      btnPrimary: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20",
    },
    emerald: {
      badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      iconBox: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
      hoverBorder: "hover:border-emerald-500/40",
      btnPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20",
    },
    amber: {
      badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      iconBox: "bg-amber-500/15 border-amber-500/25 text-amber-400",
      hoverBorder: "hover:border-amber-500/40",
      btnPrimary: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20",
    },
    sky: {
      badgeBg: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      iconBox: "bg-sky-500/15 border-sky-500/25 text-sky-400",
      hoverBorder: "hover:border-sky-500/40",
      btnPrimary: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20",
    },
  }[theme];

  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col justify-between transition-all duration-200 ${themeStyles.hoverBorder}`}
    >
      <div className="space-y-4">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl border ${themeStyles.iconBox}`}>
            <Icon size={20} />
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${themeStyles.badgeBg}`}
          >
            {badge}
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{description}</p>
        </div>

        {/* ALERT CALLOUT (IF ANY) */}
        {alert && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium animate-pulse">
            <AlertCircle size={14} className="shrink-0" />
            <span className="truncate">{alert}</span>
          </div>
        )}

        {/* FEATURE TAGS */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((t, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="pt-6 border-t border-slate-800/80 mt-5 flex items-center justify-between gap-3">
        <Link
          href={href}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition active:scale-95 ${themeStyles.btnPrimary}`}
        >
          <span>{primaryActionLabel}</span>
          <ArrowRight size={13} />
        </Link>

        {secondaryActionLabel && secondaryActionHref && (
          <Link
            href={secondaryActionHref}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {secondaryActionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
