"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import ReactSelect from "react-select";
import {
  GraduationCap,
  Network,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Search,
  X,
  ExternalLink,
  Zap,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type TabType = "semester" | "branch" | "subject" | "elective";

interface Semester {
  code: string;
  name: string;
}

interface Branch {
  code: string;
  short_name: string;
  full_name: string;
}

interface SyllabusUnit {
  unit: string;
  topics: string[];
}

interface Subject {
  _id?: string;
  code: string;
  short_name: string;
  full_name: string;
  semester_code: string;
  branch_code: string | string[];
  subject_type: string;
  subject_credit: number | string;
  max_marks: number | string;
  all_paper_pdf: string;
  syllabus?: SyllabusUnit[];
}

interface ElectiveChild {
  subject_id: string;
  short_name: string;
  full_name: string;
}

interface ElectiveGroup {
  _id: string;
  code?: string | null;
  short_name: string;
  full_name: string;
  semester_code: string;
  branch_code: string | string[];
  subjects: ElectiveChild[];
}

/* =====================================================
   AUTH HELPER & SHARED SELECT STYLES
===================================================== */

const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`,
  },
});

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "#080D1A",
    borderColor: state.isFocused ? "#6366F1" : "rgba(255, 255, 255, 0.12)",
    boxShadow: state.isFocused ? "0 0 0 1px #6366F1" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#6366F1" : "rgba(255, 255, 255, 0.25)",
    },
    borderRadius: "0.75rem",
    minHeight: "42px",
    color: "#fff",
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#0F1629",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "0.75rem",
    zIndex: 99999,
    overflow: "hidden",
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4F46E5"
      : state.isFocused
      ? "#1E293B"
      : "transparent",
    color: "#fff",
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    borderRadius: "0.5rem",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "#C7D2FE",
    fontSize: "0.75rem",
    fontWeight: 600,
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: "#C7D2FE",
    ":hover": {
      backgroundColor: "rgba(239, 68, 68, 0.3)",
      color: "#FCA5A5",
    },
  }),
  input: (base: any) => ({
    ...base,
    color: "#fff",
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "#64748B",
    fontSize: "0.875rem",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#fff",
  }),
};

function formatSemesterLabel(s: { code: string; name?: string }): string {
  if (!s.name) return `Semester ${s.code}`;
  if (s.name.toLowerCase().includes("semester")) return s.name;
  return `Semester ${s.code} - ${s.name}`;
}

function formatBranchLabel(b: { code: string; short_name?: string; full_name?: string }): string {
  if (b.short_name && b.full_name) {
    return `${b.code} - ${b.short_name} (${b.full_name})`;
  }
  if (b.short_name) {
    return `${b.code} - ${b.short_name}`;
  }
  return `${b.code} - ${b.full_name || b.code}`;
}

/* =====================================================
   MAIN PAGE
===================================================== */

export default function AdminStructurePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("semester");

  // Summary counts for header stat chips
  const [semesterCount, setSemesterCount] = useState<number>(0);
  const [branchCount, setBranchCount] = useState<number>(0);
  const [subjectCount, setSubjectCount] = useState<number>(0);
  const [electiveCount, setElectiveCount] = useState<number>(0);

  // Trigger to refresh active tab data
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🔐 Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // ⌨️ Global CTRL + F shortcut to focus active tab search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        const input = document.getElementById("ssb-search-input") as HTMLInputElement;
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  // Load summary counts
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`${API_URL}/admin/ssb/semester`, authHeader()).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/admin/ssb/branch`, authHeader()).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/admin/ssb/subject`, authHeader()).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/admin/ssb/electives`, authHeader()).then(r => r.json()).catch(() => ({})),
    ]).then(([s, b, sub, el]) => {
      setSemesterCount(Array.isArray(s?.data) ? s.data.length : 0);
      setBranchCount(Array.isArray(b?.data) ? b.data.length : 0);
      setSubjectCount(Array.isArray(sub?.data) ? sub.data.length : 0);
      setElectiveCount(Array.isArray(el?.data) ? el.data.length : 0);
    });
  }, [user, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080B14] text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading academic structure...</span>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) return null;

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute top-1/3 -left-40 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ================= TOP NAV & HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-900/80 hover:bg-slate-800 hover:text-white border border-slate-800 transition"
              >
                <ArrowLeft size={13} />
                <span>Admin Hub</span>
              </Link>
              <span className="text-slate-600">/</span>
              <Link
                href="/admin/papers"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-300 transition"
              >
                <span>Papers</span>
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                SSB Structure
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 pt-1">
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                <Network className="w-6 h-6" />
              </div>
              <span>Academic Structure</span>
            </h1>
          </div>

          {/* RIGHT ACTIONS: STATS & REFRESH */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => {
                setRefreshTrigger(prev => prev + 1);
                toast.info("Refreshed academic data");
              }}
              title="Refresh all counts and data"
              className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ================= TABS SWITCHER ================= */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            onClick={() => setActiveTab("semester")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "semester"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <GraduationCap size={16} />
            <span>Semesters</span>
            {semesterCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === "semester" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {semesterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("branch")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "branch"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Network size={16} />
            <span>Branches</span>
            {branchCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === "branch" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {branchCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("subject")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "subject"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BookOpen size={16} />
            <span>Subjects</span>
            {subjectCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === "subject" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {subjectCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("elective")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "elective"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Layers size={16} />
            <span>Elective Groups</span>
            {electiveCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === "elective" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {electiveCount}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB PANELS ================= */}
        <div className="transition-all duration-300">
          {activeTab === "semester" && <SemesterSection onCountChange={setSemesterCount} refreshTrigger={refreshTrigger} />}
          {activeTab === "branch" && <BranchSection onCountChange={setBranchCount} refreshTrigger={refreshTrigger} />}
          {activeTab === "subject" && <SubjectSection onCountChange={setSubjectCount} refreshTrigger={refreshTrigger} />}
          {activeTab === "elective" && <ElectiveSection onCountChange={setElectiveCount} refreshTrigger={refreshTrigger} />}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SEMESTER SECTION
===================================================== */

function SemesterSection({ onCountChange, refreshTrigger }: { onCountChange: (c: number) => void; refreshTrigger: number }) {
  const [list, setList] = useState<Semester[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Semester | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/ssb/semester`, authHeader());
      const json = await res.json();
      const items = Array.isArray(json.data) ? json.data : [];
      setList(items);
      onCountChange(items.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load semesters");
    } finally {
      setLoading(false);
    }
  }

  async function remove(code?: string) {
    if (!code) return;
    if (!confirm(`Are you sure you want to delete Semester ${code}?`)) return;

    const backup = list;
    setList(list.filter(s => s.code !== code));

    try {
      const res = await fetch(`${API_URL}/admin/ssb/semester/${code}`, {
        method: "DELETE",
        headers: authHeader().headers,
      });
      if (res.ok) {
        toast.success(`Semester ${code} deleted successfully`);
        onCountChange(list.length - 1);
      } else {
        toast.error("Failed to delete semester");
        setList(backup);
      }
    } catch {
      toast.error("Error deleting semester");
      setList(backup);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(s => s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
  }, [list, search]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-6 space-y-6">
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GraduationCap className="text-indigo-400" size={20} />
            <span>Semesters</span>
          </h2>
          <p className="text-xs text-slate-400">Total {list.length} semesters registered in system</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              id="ssb-search-input"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search semesters..."
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="pointer-events-auto text-slate-400 hover:text-white transition"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shadow-xs select-none">
                  Ctrl + F
                </kbd>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add Semester</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs">Loading semesters...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">{search ? "No semesters match your search" : "No semesters found"}</p>
          <p className="text-xs text-slate-500">Click &quot;Add Semester&quot; above to create one.</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0C1222] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-32">Semester Code</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map(s => (
                <tr key={s.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold">
                      {s.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    {s.name}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEdit(s);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition cursor-pointer"
                        title="Edit semester"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => remove(s.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                        title="Delete semester"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <SemesterModal
          data={edit}
          onClose={() => setOpen(false)}
          onSaved={() => {
            fetchData();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   BRANCH SECTION
===================================================== */

function BranchSection({ onCountChange, refreshTrigger }: { onCountChange: (c: number) => void; refreshTrigger: number }) {
  const [list, setList] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Branch | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/ssb/branch`, authHeader());
      const json = await res.json();
      const items = Array.isArray(json.data) ? json.data : [];
      setList(items);
      onCountChange(items.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  async function remove(code?: string) {
    if (!code) return;
    if (!confirm(`Are you sure you want to delete Branch ${code}?`)) return;

    const backup = list;
    setList(list.filter(b => b.code !== code));

    try {
      const res = await fetch(`${API_URL}/admin/ssb/branch/${code}`, {
        method: "DELETE",
        headers: authHeader().headers,
      });
      if (res.ok) {
        toast.success(`Branch ${code} deleted successfully`);
        onCountChange(list.length - 1);
      } else {
        toast.error("Failed to delete branch");
        setList(backup);
      }
    } catch {
      toast.error("Error deleting branch");
      setList(backup);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      b =>
        b.code?.toLowerCase().includes(q) ||
        b.short_name?.toLowerCase().includes(q) ||
        b.full_name?.toLowerCase().includes(q)
    );
  }, [list, search]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-6 space-y-6">
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Network className="text-indigo-400" size={20} />
            <span>Branches</span>
          </h2>
          <p className="text-xs text-slate-400">Total {list.length} branches registered in system</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              id="ssb-search-input"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search branches..."
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="pointer-events-auto text-slate-400 hover:text-white transition"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shadow-xs select-none">
                  Ctrl + F
                </kbd>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs">Loading branches...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">{search ? "No branches match your search" : "No branches found"}</p>
          <p className="text-xs text-slate-500">Click &quot;Add Branch&quot; above to create one.</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0C1222] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4 w-40">Short Name</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map(b => (
                <tr key={b.code} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold">
                      {b.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {b.short_name}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-300">
                    {b.full_name}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEdit(b);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition cursor-pointer"
                        title="Edit branch"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => remove(b.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                        title="Delete branch"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <BranchModal
          data={edit}
          onClose={() => setOpen(false)}
          onSaved={() => {
            fetchData();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   SUBJECT SECTION
===================================================== */

function SubjectSection({ onCountChange, refreshTrigger }: { onCountChange: (c: number) => void; refreshTrigger: number }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [filterSem, setFilterSem] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Subject | null>(null);

  // Syllabus Editor State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Merging all papers state
  const [loadingSubject, setLoadingSubject] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBase();
  }, [refreshTrigger]);

  async function loadBase() {
    try {
      const [s, b] = await Promise.all([
        fetch(`${API_URL}/admin/ssb/semester`, authHeader()).then(r => r.json()),
        fetch(`${API_URL}/admin/ssb/branch`, authHeader()).then(r => r.json()),
      ]);
      setSemesters(Array.isArray(s.data) ? s.data : []);
      setBranches(Array.isArray(b.data) ? b.data : []);
      fetchSubjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to load semesters and branches");
    }
  }

  async function fetchSubjects() {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (filterSem) q.append("semester", filterSem);
      if (filterBranch) q.append("branch", filterBranch);

      const res = await fetch(`${API_URL}/admin/ssb/subject?${q}`, authHeader());
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setSubjects(list);
      onCountChange(list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubjects();
  }, [filterSem, filterBranch]);

  async function remove(code: string) {
    if (!confirm(`Are you sure you want to delete subject (${code})?`)) return;

    const backup = subjects;
    setSubjects(subjects.filter(s => s.code !== code));

    try {
      const res = await fetch(`${API_URL}/admin/ssb/subject/${code}`, {
        method: "DELETE",
        headers: authHeader().headers,
      });
      if (res.ok) {
        toast.success(`Subject ${code} deleted successfully`);
        onCountChange(subjects.length - 1);
      } else {
        toast.error("Failed to delete subject");
        setSubjects(backup);
      }
    } catch {
      toast.error("Error deleting subject");
      setSubjects(backup);
    }
  }

  // Merge all papers of a subject into a single master PDF
  const handleMerge = async (subjectCode: string) => {
    try {
      setLoadingSubject(subjectCode);
      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: "Merging...",
      }));

      const res = await fetch(`${API_URL}/admin/merge-subject-pdfs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ subject_code: subjectCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Merge failed");
      }

      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: `✔ ${data.total_papers || "All"} papers merged (${(data.papers || []).map((p: any) => p.year).join(", ")})`,
      }));

      toast.success(`Merged papers successfully for ${subjectCode}!`);

      // Update subject local state with new merged PDF URL
      setSubjects(prev =>
        prev.map(s => (s.code === subjectCode ? { ...s, all_paper_pdf: data.url } : s))
      );
    } catch (err: any) {
      console.error(err);
      setStatusMap(prev => ({
        ...prev,
        [subjectCode]: `Error: ${err.message}`,
      }));
      toast.error(err.message || "Failed to merge subject papers");
    } finally {
      setLoadingSubject(null);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      s =>
        s.code?.toLowerCase().includes(q) ||
        s.short_name?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) ||
        s.subject_type?.toLowerCase().includes(q) ||
        (Array.isArray(s.branch_code)
          ? s.branch_code.some(b => b.toLowerCase().includes(q))
          : String(s.branch_code || "").toLowerCase().includes(q))
    );
  }, [subjects, search]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-6 space-y-6">
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="text-indigo-400" size={20} />
            <span>Subjects</span>
          </h2>
          <p className="text-xs text-slate-400">Manage curriculum subjects, credits, syllabus, and paper merges</p>
        </div>

        <button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Subject</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={filterSem}
          onChange={e => setFilterSem(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Semesters</option>
          {semesters.map(s => (
            <option key={s.code} value={s.code}>
              {formatSemesterLabel(s)}
            </option>
          ))}
        </select>

        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.code} value={b.code}>
              {formatBranchLabel(b)}
            </option>
          ))}
        </select>

        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          <input
            id="ssb-search-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects by name, code, or branch..."
            className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="pointer-events-auto text-slate-400 hover:text-white transition"
                title="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shadow-xs select-none">
                Ctrl + F
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredSubjects.length}</strong> of <strong className="text-white">{subjects.length}</strong> subjects
        </span>
        {(filterSem || filterBranch || search) && (
          <button
            onClick={() => {
              setFilterSem("");
              setFilterBranch("");
              setSearch("");
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs">Loading subjects...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">{search || filterSem || filterBranch ? "No subjects match your filters" : "No subjects found"}</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or click &quot;Add Subject&quot; above.</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0C1222] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 w-24">Sem</th>
                <th className="py-3 px-4">Branch(es)</th>
                <th className="py-3 px-4 w-24">Type</th>
                <th className="py-3 px-4 w-20">Credit</th>
                <th className="py-3 px-4 w-24">Max Marks</th>
                <th className="py-3 px-4 min-w-[200px]">Combined PDF</th>
                <th className="py-3 px-4 text-right min-w-[190px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredSubjects.map(s => {
                const isSelectedForSyllabus = selectedSubject?.code === s.code;

                return (
                  <Fragment key={s.code}>
                    <tr className={`hover:bg-slate-800/30 transition-colors ${isSelectedForSyllabus ? "bg-indigo-950/20" : ""}`}>
                      {/* 1. SUBJECT NAME & CODE */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {s.short_name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                              {s.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-tight">
                            {s.full_name}
                          </p>
                        </div>
                      </td>

                      {/* 2. SEMESTER */}
                      <td className="py-3.5 px-4 align-top font-semibold text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                          Sem {s.semester_code}
                        </span>
                      </td>

                      {/* 3. BRANCHES */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {Array.isArray(s.branch_code)
                            ? s.branch_code.map((b: string) => (
                                <span
                                  key={b}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700"
                                >
                                  {b}
                                </span>
                              ))
                            : (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {s.branch_code}
                                </span>
                              )}
                        </div>
                      </td>

                      {/* 4. TYPE */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize border ${
                            s.subject_type?.toLowerCase() === "practical"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {s.subject_type || "Theory"}
                        </span>
                      </td>

                      {/* 5. CREDIT */}
                      <td className="py-3.5 px-4 align-top font-mono font-bold text-amber-300">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                          {s.subject_credit ?? "—"}
                        </span>
                      </td>

                      {/* 6. MAX MARKS */}
                      <td className="py-3.5 px-4 align-top font-mono font-bold text-emerald-300">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25">
                          {s.max_marks ?? "—"}
                        </span>
                      </td>

                      {/* 7. ALL PAPERS PDF & MERGE TOOL */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-2">
                            {s.all_paper_pdf ? (
                              <a
                                href={s.all_paper_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                                title="Open merged PDF in new tab"
                              >
                                <ExternalLink size={11} />
                                <span>View PDF</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">No PDF</span>
                            )}

                            <button
                              onClick={() => handleMerge(s.code)}
                              disabled={loadingSubject === s.code}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition cursor-pointer ${
                                loadingSubject === s.code
                                  ? "bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed"
                                  : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25 active:scale-95"
                              }`}
                              title="Merge all yearly question papers into one PDF"
                            >
                              {loadingSubject === s.code ? (
                                <>
                                  <RefreshCw size={11} className="animate-spin text-indigo-400" />
                                  <span>Merging...</span>
                                </>
                              ) : (
                                <>
                                  <Zap size={11} className="text-amber-400" />
                                  <span>Merge</span>
                                </>
                              )}
                            </button>
                          </div>

                          {statusMap[s.code] && (
                            <span
                              className={`text-[10px] font-medium leading-tight ${
                                statusMap[s.code].startsWith("Error") ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {statusMap[s.code]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. ACTIONS */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSubject(prev => (prev?.code === s.code ? null : s));
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                              isSelectedForSyllabus
                                ? "bg-purple-600 text-white border-purple-400 shadow-xs"
                                : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border-purple-500/25"
                            }`}
                            title="Manage chapter-wise syllabus modules"
                          >
                            <BookOpen size={12} />
                            <span>{isSelectedForSyllabus ? "Close" : "Syllabus"}</span>
                          </button>

                          <button
                            onClick={() => {
                              setEdit(s);
                              setOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition cursor-pointer"
                            title="Edit subject"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => remove(s.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                            title="Delete subject"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDABLE INLINE SYLLABUS EDITOR */}
                    {isSelectedForSyllabus && (
                      <tr>
                        <td colSpan={8} className="p-0 border-t-0">
                          <div className="bg-[#0A0F1E] border-y border-purple-500/30 p-6 animate-fade-in shadow-inner">
                            <InlineSyllabusEditor
                              subject={s}
                              onSaved={() => {
                                fetchSubjects();
                                setSelectedSubject(null);
                              }}
                              onCancel={() => setSelectedSubject(null)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <SubjectModal
          data={edit}
          semesters={semesters}
          branches={branches}
          onClose={() => setOpen(false)}
          onSaved={() => {
            fetchSubjects();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   ELECTIVE SECTION
===================================================== */

function ElectiveSection({ onCountChange, refreshTrigger }: { onCountChange: (c: number) => void; refreshTrigger: number }) {
  const [electives, setElectives] = useState<ElectiveGroup[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [filterSem, setFilterSem] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ElectiveGroup | null>(null);

  useEffect(() => {
    loadBase();
  }, [refreshTrigger]);

  async function loadBase() {
    try {
      const [s, b] = await Promise.all([
        fetch(`${API_URL}/admin/ssb/semester`, authHeader()).then(r => r.json()),
        fetch(`${API_URL}/admin/ssb/branch`, authHeader()).then(r => r.json()),
      ]);
      setSemesters(Array.isArray(s.data) ? s.data : []);
      setBranches(Array.isArray(b.data) ? b.data : []);
      fetchElectives();
    } catch (err) {
      console.error(err);
      toast.error("Failed to load semesters and branches");
    }
  }

  async function fetchElectives() {
    try {
      setLoading(true);
      const q = new URLSearchParams();
      if (filterSem) q.append("semester", filterSem);
      if (filterBranch) q.append("branch", filterBranch);

      const res = await fetch(`${API_URL}/admin/ssb/electives?${q}`, authHeader());
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setElectives(list);
      onCountChange(list.length);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load elective groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchElectives();
  }, [filterSem, filterBranch]);

  async function remove(id: string) {
    if (!confirm("Delete this elective group? Note: Child subjects will NOT be deleted.")) return;

    const backup = electives;
    setElectives(electives.filter(e => e._id !== id));

    try {
      const res = await fetch(`${API_URL}/admin/ssb/electives/${id}`, {
        method: "DELETE",
        headers: authHeader().headers,
      });
      if (res.ok) {
        toast.success("Elective group deleted successfully");
        onCountChange(electives.length - 1);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to delete elective group");
        setElectives(backup);
      }
    } catch {
      toast.error("Error deleting elective group");
      setElectives(backup);
    }
  }

  const filteredElectives = useMemo(() => {
    if (!search.trim()) return electives;
    const q = search.toLowerCase();
    return electives.filter(
      eg =>
        eg.code?.toLowerCase().includes(q) ||
        eg.short_name?.toLowerCase().includes(q) ||
        eg.full_name?.toLowerCase().includes(q) ||
        (Array.isArray(eg.branch_code)
          ? eg.branch_code.some(b => b.toLowerCase().includes(q))
          : String(eg.branch_code || "").toLowerCase().includes(q)) ||
        (eg.subjects || []).some(
          s => s.short_name?.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q)
        )
    );
  }, [electives, search]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-6 space-y-6">
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-indigo-400" size={20} />
            <span>Elective Subject Groups</span>
          </h2>
          <p className="text-xs text-slate-400">Bundle alternative subjects into choice groups (e.g. Program Elective, Open Elective)</p>
        </div>

        <button
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Elective Group</span>
        </button>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={filterSem}
          onChange={e => setFilterSem(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Semesters</option>
          {semesters.map(s => (
            <option key={s.code} value={s.code}>
              {formatSemesterLabel(s)}
            </option>
          ))}
        </select>

        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.code} value={b.code}>
              {formatBranchLabel(b)}
            </option>
          ))}
        </select>

        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          <input
            id="ssb-search-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search elective groups..."
            className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="pointer-events-auto text-slate-400 hover:text-white transition"
                title="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shadow-xs select-none">
                Ctrl + F
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs">Loading elective groups...</p>
        </div>
      ) : filteredElectives.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-2">
          <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-300">{search || filterSem || filterBranch ? "No elective groups match your filters" : "No elective groups found"}</p>
          <p className="text-xs text-slate-500">Click &quot;Add Elective Group&quot; above to create one.</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0C1222] border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-28">Group Code</th>
                <th className="py-3 px-4 w-36">Short Name</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4 w-24">Sem</th>
                <th className="py-3 px-4">Branch(es)</th>
                <th className="py-3 px-4">Choice Subjects</th>
                <th className="py-3 px-4 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredElectives.map(eg => (
                <tr key={eg._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono">
                    {eg.code ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                        {eg.code}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white text-sm">
                    {eg.short_name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">
                    {eg.full_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                      Sem {eg.semester_code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {Array.isArray(eg.branch_code)
                        ? eg.branch_code.map((b: string) => (
                            <span
                              key={b}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {b}
                            </span>
                          ))
                        : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {eg.branch_code}
                            </span>
                          )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-sm">
                      {eg.subjects && eg.subjects.length > 0 ? (
                        eg.subjects.map(s => (
                          <span
                            key={s.subject_id}
                            className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                            title={s.full_name}
                          >
                            {s.short_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No subjects linked</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEdit(eg);
                          setOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 transition cursor-pointer"
                        title="Edit elective group"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => remove(eg._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                        title="Delete elective group"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ElectiveModal
          data={edit}
          semesters={semesters}
          branches={branches}
          onClose={() => setOpen(false)}
          onSaved={() => {
            fetchElectives();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   INLINE SYLLABUS EDITOR (ADD MODULE & SAVE ARE DOWN AFTER ALL MODULES)
===================================================== */

function InlineSyllabusEditor({
  subject,
  onSaved,
  onCancel,
}: {
  subject: Subject;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [units, setUnits] = useState<SyllabusUnit[]>(
    subject?.syllabus?.length ? subject.syllabus : [{ unit: "", topics: [""] }]
  );
  const [saving, setSaving] = useState(false);

  function addUnit() {
    setUnits([...units, { unit: "", topics: [""] }]);
  }

  function removeUnit(index: number) {
    if (units.length <= 1) {
      setUnits([{ unit: "", topics: [""] }]);
      return;
    }
    setUnits(units.filter((_, i) => i !== index));
  }

  function updateUnit(index: number, value: string) {
    const updated = [...units];
    updated[index].unit = value;
    setUnits(updated);
  }

  function updateTopic(uIndex: number, tIndex: number, value: string) {
    const updated = [...units];
    updated[uIndex].topics[tIndex] = value;
    setUnits(updated);
  }

  function addTopic(uIndex: number) {
    const updated = [...units];
    updated[uIndex].topics.push("");
    setUnits(updated);
  }

  function removeTopic(uIndex: number, tIndex: number) {
    const updated = [...units];
    if (updated[uIndex].topics.length <= 1) {
      updated[uIndex].topics = [""];
    } else {
      updated[uIndex].topics = updated[uIndex].topics.filter((_, i) => i !== tIndex);
    }
    setUnits(updated);
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/ssb/subject/${subject.code}/syllabus`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ syllabus: units }),
      });

      if (!res.ok) {
        throw new Error("Failed to save syllabus");
      }

      toast.success(`Syllabus saved for ${subject.short_name}!`);
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save syllabus");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-400">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Course Syllabus — {subject.short_name} <span className="text-purple-300 font-mono text-xs">({subject.code})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {units.length} module{units.length !== 1 ? "s" : ""} defined for this subject
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Close syllabus editor"
        >
          <X size={16} />
        </button>
      </div>

      {/* MODULES LIST */}
      <div className="space-y-4">
        {units.map((u, ui) => (
          <div
            key={ui}
            className="bg-[#0B1020] border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 space-y-3 transition"
          >
            {/* MODULE TITLE ROW */}
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                MODULE {ui + 1}
              </span>

              <input
                className="flex-1 bg-[#080D1A] border border-slate-700/80 text-white font-semibold text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-500"
                placeholder="Module / Unit Title (e.g. Asymptotic Notation and Divide & Conquer)"
                value={u.unit}
                onChange={e => updateUnit(ui, e.target.value)}
              />

              <button
                type="button"
                onClick={() => removeUnit(ui)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                title="Delete this module"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* TOPICS LIST */}
            <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-purple-500/30 ml-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Topics Covered
              </div>

              {u.topics.map((t, ti) => (
                <div key={ti} className="flex items-center gap-2">
                  <span className="text-purple-400 font-mono text-xs select-none">•</span>
                  <input
                    className="flex-1 bg-[#080D1A] border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-600"
                    placeholder={`Topic #${ti + 1}`}
                    value={t}
                    onChange={e => updateTopic(ui, ti, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeTopic(ui, ti)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer"
                    title="Remove topic"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addTopic(ui)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 mt-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Topic</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM ACTIONS - DOWN AFTER ALL MODULES */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-purple-500/20">
        <button
          type="button"
          onClick={addUnit}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Another Module</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/80 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 border border-purple-400/30 transition disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving Syllabus...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Save Syllabus</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MODAL CONTAINER (PORTAL + BODY SCROLL LOCK)
===================================================== */

function ModalWrapper({
  children,
  onClose,
  maxWidth = "max-w-md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 🔒 Lock background body scrolling completely while modal is open
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click interceptor */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        onClick={e => e.stopPropagation()}
        className={`relative z-10 bg-[#0F1629] ${maxWidth} w-full rounded-2xl border border-slate-700/80 shadow-2xl p-6 sm:p-7 text-slate-100 my-auto animate-scale-up`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* =====================================================
   SEMESTER MODAL
===================================================== */

function SemesterModal({ data, onClose, onSaved }: { data: Semester | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(data?.code || "");
  const [name, setName] = useState(data?.name || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !name.trim()) {
      toast.error("Please fill in both Code and Name");
      return;
    }

    setSaving(true);
    const method = data ? "PUT" : "POST";
    const url = data ? `${API_URL}/admin/ssb/semester/${data.code}` : `${API_URL}/admin/ssb/semester`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to save semester");
      }

      toast.success(data ? "Semester updated successfully" : "Semester created successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Error saving semester");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalWrapper onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{data ? "Edit Semester" : "Add Semester"}</h3>
              <p className="text-xs text-slate-400">Enter semester numeric code and title</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Semester Code <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50"
              placeholder="e.g. 1, 2, 3..."
              value={code}
              disabled={!!data}
              onChange={e => setCode(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Semester Display Name <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 1st Semester, 4th Semester"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !code || !name}
            onClick={submit}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Semester"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* =====================================================
   BRANCH MODAL
===================================================== */

function BranchModal({ data, onClose, onSaved }: { data: Branch | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(data?.code || "");
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim() || !shortName.trim() || !fullName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    const method = data ? "PUT" : "POST";
    const url = data ? `${API_URL}/admin/ssb/branch/${data.code}` : `${API_URL}/admin/ssb/branch`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          short_name: shortName.trim(),
          full_name: fullName.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save branch");
      }

      toast.success(data ? "Branch updated successfully" : "Branch created successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Error saving branch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalWrapper onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{data ? "Edit Branch" : "Add Branch"}</h3>
              <p className="text-xs text-slate-400">Define engineering department details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Branch Code <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:opacity-50"
              placeholder="e.g. 105 or CSE"
              value={code}
              disabled={!!data}
              onChange={e => setCode(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Short Name <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. CSE or MECH"
              value={shortName}
              onChange={e => setShortName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Full Branch Name <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Computer Science & Engineering"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !code || !shortName || !fullName}
            onClick={submit}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Branch"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* =====================================================
   SUBJECT MODAL
===================================================== */

function SubjectModal({
  data,
  semesters,
  branches,
  onClose,
  onSaved,
}: {
  data: Subject | null;
  semesters: Semester[];
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(data?.code || "");
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");
  const [semester, setSemester] = useState(data?.semester_code || "");
  const [branchCodes, setBranchCodes] = useState<string[]>(
    Array.isArray(data?.branch_code) ? data.branch_code : data?.branch_code ? [data.branch_code] : []
  );
  const [subject_type, setsubject_type] = useState(data?.subject_type || "Theory");
  const [subject_credit, setsubject_credit] = useState(data?.subject_credit !== undefined ? String(data.subject_credit) : "");
  const [max_marks, setmax_marks] = useState(data?.max_marks !== undefined ? String(data.max_marks) : "100");
  const [all_paper_pdf, setall_paper_pdf] = useState(data?.all_paper_pdf || "");
  const [saving, setSaving] = useState(false);

  const branchOptions = useMemo(
    () =>
      branches.map(b => ({
        value: b.code,
        label: formatBranchLabel(b),
      })),
    [branches]
  );

  async function submit() {
    if (!code || !shortName || !fullName || !semester || branchCodes.length === 0 || !subject_type || !max_marks) {
      toast.error("Please fill in all mandatory fields (*)");
      return;
    }

    setSaving(true);
    const method = data ? "PUT" : "POST";
    const url = data ? `${API_URL}/admin/ssb/subject/${data._id || data.code}` : `${API_URL}/admin/ssb/subject`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          short_name: shortName.trim(),
          full_name: fullName.trim(),
          semester_code: semester,
          branch_code: branchCodes,
          subject_type,
          subject_credit: subject_credit ? Number(subject_credit) : 0,
          max_marks: Number(max_marks),
          all_paper_pdf: all_paper_pdf.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || "Failed to save subject");
      }

      toast.success(data ? "Subject updated successfully" : "Subject created successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Error saving subject");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalWrapper onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-5 max-h-[85vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{data ? "Edit Subject" : "Add Subject"}</h3>
              <p className="text-xs text-slate-400">Configure subject code, title, credits, and branches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Subject Code <span className="text-rose-400">*</span>
              </label>
              <input
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="e.g. 105601"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Short Name <span className="text-rose-400">*</span>
              </label>
              <input
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. DAA or OS"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Full Subject Name <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Design & Analysis of Algorithms"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          {/* BRANCHES (MULTI-SELECT) */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Branch(es) <span className="text-rose-400">*</span>
            </label>
            <ReactSelect
              isMulti
              styles={customSelectStyles}
              options={branchOptions}
              value={branchOptions.filter(opt => branchCodes.includes(opt.value))}
              onChange={(selected: any) => setBranchCodes(selected ? selected.map((s: any) => s.value) : [])}
              placeholder="Search and select one or more branches..."
              classNamePrefix="react-select"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Semester <span className="text-rose-400">*</span>
              </label>
              <select
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              >
                <option value="">Select Semester</option>
                {semesters.map(s => (
                  <option key={s.code} value={s.code}>
                    {formatSemesterLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Subject Type <span className="text-rose-400">*</span>
              </label>
              <select
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={subject_type}
                onChange={e => setsubject_type(e.target.value)}
              >
                <option value="Theory">Theory</option>
                <option value="Practical">Practical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Max Marks <span className="text-rose-400">*</span>
              </label>
              <select
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={max_marks}
                onChange={e => setmax_marks(e.target.value)}
              >
                <option value="100">100</option>
                <option value="50">50</option>
                <option value="25">25</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Subject Credit</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 3 or 4"
                value={subject_credit}
                onChange={e => setsubject_credit(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Combined All-Papers PDF Link <span className="text-slate-500 font-normal">(Auto-generated via &quot;Merge&quot; or custom link)</span>
            </label>
            <input
              type="text"
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="https://...all_papers.pdf"
              value={all_paper_pdf}
              onChange={e => setall_paper_pdf(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Subject"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* =====================================================
   ELECTIVE MODAL
===================================================== */

function ElectiveModal({
  data,
  semesters,
  branches,
  onClose,
  onSaved,
}: {
  data: ElectiveGroup | null;
  semesters: Semester[];
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [semester, setSemester] = useState(data?.semester_code || "");
  const [branchCodes, setBranchCodes] = useState<string[]>(
    Array.isArray(data?.branch_code) ? data.branch_code : data?.branch_code ? [data.branch_code] : []
  );
  const [shortName, setShortName] = useState(data?.short_name || "");
  const [fullName, setFullName] = useState(data?.full_name || "");
  const [code, setCode] = useState(data?.code || "");
  const [subjects, setSubjects] = useState<ElectiveChild[]>(data?.subjects ? [...data.subjects] : []);

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  const branchOptions = useMemo(
    () =>
      branches.map(b => ({
        value: b.code,
        label: formatBranchLabel(b),
      })),
    [branches]
  );

  useEffect(() => {
    if (!semester) {
      setAvailableSubjects([]);
      return;
    }
    async function loadSubjects() {
      setLoadingSubjects(true);
      try {
        const res = await fetch(`${API_URL}/admin/ssb/subject?semester=${semester}`, authHeader());
        const json = await res.json();
        setAvailableSubjects(Array.isArray(json.data) ? json.data : []);
      } catch {
        setAvailableSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, [semester]);

  const selectableSubjects = useMemo(
    () => availableSubjects.filter(as => !subjects.some(s => s.subject_id === as._id)),
    [availableSubjects, subjects]
  );

  function handleAddSubject() {
    if (!selectedSubjectId) return;
    const subj = availableSubjects.find(s => s._id === selectedSubjectId);
    if (!subj || !subj._id) return;

    setSubjects(prev => [
      ...prev,
      {
        subject_id: subj._id as string,
        short_name: subj.short_name,
        full_name: subj.full_name,
      },
    ]);
    setSelectedSubjectId("");
  }

  function handleRemoveSubject(subjectId: string) {
    setSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
  }

  async function submit() {
    if (!shortName.trim() || !fullName.trim() || !semester || branchCodes.length === 0 || subjects.length === 0) {
      toast.error("Please fill in all mandatory fields and add at least one subject");
      return;
    }

    setSaving(true);
    const method = data ? "PUT" : "POST";
    const url = data ? `${API_URL}/admin/ssb/electives/${data._id}` : `${API_URL}/admin/ssb/electives`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          semester_code: semester,
          branch_code: branchCodes,
          code: code.trim() || null,
          short_name: shortName.trim(),
          full_name: fullName.trim(),
          subjects: subjects.map(s => ({
            subject_id: s.subject_id,
            short_name: s.short_name,
            full_name: s.full_name,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || "Failed to save elective group");
      }

      toast.success(data ? "Elective group updated successfully" : "Elective group created successfully");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Error saving elective group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalWrapper onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5 max-h-[85vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{data ? "Edit Elective Group" : "Add Elective Group"}</h3>
              <p className="text-xs text-slate-400">Group alternative subjects into elective baskets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Short Name <span className="text-rose-400">*</span>
              </label>
              <input
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. PE-I or OE-I"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Elective Code <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="e.g. 1056XX"
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Program Elective - I"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Semester <span className="text-rose-400">*</span>
              </label>
              <select
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              >
                <option value="">Select Semester</option>
                {semesters.map(s => (
                  <option key={s.code} value={s.code}>
                    {formatSemesterLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Branch(es) <span className="text-rose-400">*</span>
              </label>
              <ReactSelect
                isMulti
                styles={customSelectStyles}
                options={branchOptions}
                value={branchOptions.filter(opt => branchCodes.includes(opt.value))}
                onChange={(selected: any) => setBranchCodes(selected ? selected.map((s: any) => s.value) : [])}
                placeholder="Select branch(es)..."
                classNamePrefix="react-select"
              />
            </div>
          </div>

          {/* CHOICE SUBJECTS BUNDLER */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Choice Subjects In Group</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {subjects.length} added
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <select
                className="flex-1 bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 cursor-pointer"
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                disabled={!semester || loadingSubjects}
              >
                <option value="">
                  {!semester
                    ? "← Select a semester first to see subjects"
                    : loadingSubjects
                    ? "Loading semester subjects..."
                    : selectableSubjects.length === 0
                    ? "All semester subjects are already in this group"
                    : "-- Select Subject to Add --"}
                </option>
                {selectableSubjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.short_name} ({s.code}) — {s.full_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddSubject}
                disabled={!selectedSubjectId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>

            {/* SUBJECTS LIST */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {subjects.length === 0 ? (
                <div className="py-6 border-2 border-dashed border-slate-800 rounded-xl text-center bg-[#080D1A]/50 space-y-1">
                  <p className="text-xs text-slate-400 font-medium">No subjects added to this elective group yet.</p>
                  <p className="text-[11px] text-slate-500">Pick subjects from the dropdown above and click &quot;Add&quot;.</p>
                </div>
              ) : (
                subjects.map((s, idx) => (
                  <div
                    key={s.subject_id}
                    className="flex items-center justify-between bg-[#080D1A] hover:bg-slate-800/40 px-3.5 py-2.5 rounded-xl border border-slate-800 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-white text-xs block">{s.short_name}</span>
                        <span className="text-[11px] text-slate-400 truncate block">{s.full_name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSubject(s.subject_id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0 ml-2"
                      title="Remove from elective group"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Elective Group"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}