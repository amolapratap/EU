"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ArrowLeft,
  X,
  FileCheck,
  FileWarning,
  GraduationCap,
  BookOpen,
  Layers,
  Sparkles,
  Scissors,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Zap,
  RotateCcw,
  MoveLeft,
  MoveRight,
  FilePlus,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import {
  getPdfPageCount,
  extractSelectedPages,
  convertImagesToPdf,
  compressPdfFile,
  parsePageRange,
  formatPageRange,
  formatFileSize,
} from "./pdfUtils";

/* ================= TYPES ================= */

interface Semester {
  code: string;
  name: string;
}

interface Branch {
  code: string;
  short_name: string;
  full_name: string;
}

interface Subject {
  _id?: string;
  code: string;
  short_name: string;
  full_name: string;
}

interface Paper {
  _id: string;
  name: string;
  type: string;
  paper_type: string;
  year: number;
  description?: string;
  paper_pdf?: string;
  subject_code?: string;
}

/* ================= AUTH HELPER ================= */

const auth = () => ({
  headers: {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`,
  },
});

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

/* ================= MAIN PAGE ================= */

export default function AdminPapersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);

  const [semester, setSemester] = useState("");
  const [branch, setBranch] = useState("");
  const [subject, setSubject] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBase, setLoadingBase] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Paper | null>(null);

  const [fileMap, setFileMap] = useState<{ [key: string]: File | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [examTypeMap, setExamTypeMap] = useState<{ [key: string]: string }>({});
  const [previewMap, setPreviewMap] = useState<{ [key: string]: string }>({});
  const [showPreviewMap, setShowPreviewMap] = useState<{ [key: string]: boolean }>({});

  // 📄 Partial page selection & multi-image state
  const [pageCountMap, setPageCountMap] = useState<{ [key: string]: number }>({});
  const [selectedPagesMap, setSelectedPagesMap] = useState<{ [key: string]: number[] }>({});
  const [rangeInputMap, setRangeInputMap] = useState<{ [key: string]: string }>({});
  const [pageSelectorOpenMap, setPageSelectorOpenMap] = useState<{ [key: string]: boolean }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 🖼️ Multi-image drag/drop, paste & rearrange state
  const [imageItemsMap, setImageItemsMap] = useState<{
    [key: string]: { id: string; file: File; preview: string; name: string }[];
  }>({});
  const [isDraggingOverMap, setIsDraggingOverMap] = useState<{ [key: string]: boolean }>({});
  const [activePaperFocusId, setActivePaperFocusId] = useState<string | null>(null);

  // ⚡ Compression / Size reduction state
  const [originalUncompressedMap, setOriginalUncompressedMap] = useState<{ [key: string]: File | null }>({});
  const [isCompressingMap, setIsCompressingMap] = useState<{ [key: string]: boolean }>({});
  const [compressionStatsMap, setCompressionStatsMap] = useState<{
    [key: string]: { original: number; compressed: number; percent: number } | null;
  }>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ⌨️ CTRL + F Shortcut for instant search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        if (subject && searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [subject]);

  // 📋 Global / window paste listener for copying & pasting screenshots/images into active paper
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!activePaperFocusId) return;
      const targetPaper = papers.find(p => p._id === activePaperFocusId);
      if (!targetPaper) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedImageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            const fileName = `pasted_${Date.now()}_page${(imageItemsMap[targetPaper._id]?.length || 0) + pastedImageFiles.length + 1}.png`;
            pastedImageFiles.push(new File([blob], fileName, { type: blob.type || "image/png" }));
          }
        }
      }

      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        appendImagesToPaper(targetPaper, pastedImageFiles);
        toast.success(`📋 Pasted ${pastedImageFiles.length} image(s) from clipboard into ${targetPaper.name}!`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activePaperFocusId, papers, imageItemsMap]);

  // 🔐 Guard
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* ---------- Load Semester & Branch ---------- */
  useEffect(() => {
    loadBase();
  }, []);

  async function loadBase() {
    try {
      setLoadingBase(true);
      const [s, b] = await Promise.all([
        fetch(`${API_URL}/admin/ssb/semester`, auth()).then(r => r.json()),
        fetch(`${API_URL}/admin/ssb/branch`, auth()).then(r => r.json()),
      ]);

      setSemesters(s.data || []);
      setBranches(b.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load semesters and branches");
    } finally {
      setLoadingBase(false);
    }
  }

  /* ---------- Load Subjects ---------- */
  useEffect(() => {
    if (!semester || !branch) {
      setSubjects([]);
      setSubject("");
      return;
    }

    setLoadingSubjects(true);
    fetch(
      `${API_URL}/admin/ssb/subject?semester=${semester}&branch=${branch}`,
      auth()
    )
      .then(r => r.json())
      .then(j => setSubjects(j.data || []))
      .catch(err => {
        console.error(err);
        toast.error("Failed to load subjects");
      })
      .finally(() => setLoadingSubjects(false));
  }, [semester, branch]);

  /* ---------- Load Papers ---------- */
  useEffect(() => {
    if (!subject) {
      setPapers([]);
      return;
    }
    fetchPapers();
  }, [subject]);

  async function fetchPapers() {
    try {
      setLoadingPapers(true);
      const res = await fetch(`${API_URL}/admin/papers/${subject}`, auth());
      const json = await res.json();
      setPapers(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch papers");
    } finally {
      setLoadingPapers(false);
    }
  }

  async function remove(id: string) {
    if (!id) return;
    if (!confirm("Are you sure you want to permanently delete this paper?")) return;

    try {
      const res = await fetch(`${API_URL}/admin/papers/${id}`, {
        method: "DELETE",
        headers: auth().headers,
      });

      if (res.ok) {
        toast.success("Paper deleted successfully");
        fetchPapers();
      } else {
        toast.error("Failed to delete paper");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting paper");
    }
  }

  // 🔄 Sync image items list to a single multi-page PDF
  async function syncImagesToPdf(
    p: Paper,
    items: { id: string; file: File; preview: string; name: string }[]
  ) {
    if (items.length === 0) {
      setImageItemsMap(prev => ({ ...prev, [p._id]: [] }));
      setFileMap(prev => ({ ...prev, [p._id]: null }));
      setPreviewMap(prev => ({ ...prev, [p._id]: "" }));
      setShowPreviewMap(prev => ({ ...prev, [p._id]: false }));
      setPageCountMap(prev => ({ ...prev, [p._id]: 0 }));
      setSelectedPagesMap(prev => ({ ...prev, [p._id]: [] }));
      setRangeInputMap(prev => ({ ...prev, [p._id]: "" }));
      setPageSelectorOpenMap(prev => ({ ...prev, [p._id]: false }));
      setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
      setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
      return;
    }

    setProcessingId(p._id);
    try {
      const files = items.map(item => item.file);
      const convertedPdf = await convertImagesToPdf(files, p.name || `paper_${p.year}`);
      const count = items.length;

      setImageItemsMap(prev => ({ ...prev, [p._id]: items }));
      setFileMap(prev => ({ ...prev, [p._id]: convertedPdf }));
      setPreviewMap(prev => ({ ...prev, [p._id]: URL.createObjectURL(convertedPdf) }));
      setPageCountMap(prev => ({ ...prev, [p._id]: count }));
      const allPages = Array.from({ length: count }, (_, i) => i + 1);
      setSelectedPagesMap(prev => ({ ...prev, [p._id]: allPages }));
      setRangeInputMap(prev => ({ ...prev, [p._id]: count > 1 ? `1-${count}` : "1" }));
      setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
      setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process images into PDF");
    } finally {
      setProcessingId(null);
    }
  }

  // ➕ Append 1 or more images (from paste, drag & drop, or file picker)
  async function appendImagesToPaper(p: Paper, newFiles: File[]) {
    const existing = imageItemsMap[p._id] || [];
    const newItems = newFiles.map((file, idx) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`,
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));

    const combined = [...existing, ...newItems];
    await syncImagesToPdf(p, combined);
  }

  // ⇄ Rearrange / move image position
  async function reorderImage(p: Paper, fromIndex: number, toIndex: number) {
    const list = [...(imageItemsMap[p._id] || [])];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    await syncImagesToPdf(p, list);
  }

  // ✕ Remove single image
  async function removeSingleImage(p: Paper, index: number) {
    const list = [...(imageItemsMap[p._id] || [])];
    list.splice(index, 1);
    await syncImagesToPdf(p, list);
  }

  // ⚡ Compress current PDF (reduces scanner/photo PDF size while maintaining sharp text)
  async function compressCurrentPdf(p: Paper) {
    const currentFile = fileMap[p._id];
    if (!currentFile) {
      toast.error("No file to compress");
      return;
    }

    setIsCompressingMap(prev => ({ ...prev, [p._id]: true }));
    try {
      toast.info("Compressing PDF pages while maintaining readability...");
      const res = await compressPdfFile(currentFile, "medium");

      if (!originalUncompressedMap[p._id]) {
        setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: currentFile }));
      }

      setFileMap(prev => ({ ...prev, [p._id]: res.file }));
      setPreviewMap(prev => ({ ...prev, [p._id]: URL.createObjectURL(res.file) }));
      setCompressionStatsMap(prev => ({
        ...prev,
        [p._id]: {
          original: res.originalSize,
          compressed: res.newSize,
          percent: res.reductionPercent,
        },
      }));

      if (res.reductionPercent > 5) {
        toast.success(
          `⚡ Reduced size by ${res.reductionPercent}% (${formatFileSize(res.originalSize)} → ${formatFileSize(res.newSize)})!`
        );
      } else {
        toast.info(`PDF is already well-optimized (${formatFileSize(res.newSize)}).`);
      }
    } catch (err: any) {
      console.error("Compression error:", err);
      toast.error(err?.message || "Failed to compress PDF");
    } finally {
      setIsCompressingMap(prev => ({ ...prev, [p._id]: false }));
    }
  }

  // ↩ Revert compression back to original file
  function revertCompression(p: Paper) {
    const original = originalUncompressedMap[p._id];
    if (!original) return;

    setFileMap(prev => ({ ...prev, [p._id]: original }));
    setPreviewMap(prev => ({ ...prev, [p._id]: URL.createObjectURL(original) }));
    setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
    setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
    toast.info("Reverted to original uncompressed file.");
  }

  // 🎯 Handle drag & dropped files
  async function handleFilesDropped(p: Paper, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const images = files.filter(f => f.type.startsWith("image/"));
    const pdfs = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));

    if (images.length > 0) {
      await appendImagesToPaper(p, images);
      toast.success(`Added ${images.length} image(s) to paper!`);
    } else if (pdfs.length > 0) {
      setImageItemsMap(prev => ({ ...prev, [p._id]: [] }));
      setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
      setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
      await handleFilesSelected(p, fileList);
    }
  }

  async function handleFilesSelected(p: Paper, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const isAllImages = files.every(f => f.type.startsWith("image/"));

    if (isAllImages) {
      await appendImagesToPaper(p, files);
      toast.success(`Loaded ${files.length} image(s)! You can add more, reorder, or upload.`);
      return;
    }

    setProcessingId(p._id);

    try {
      setImageItemsMap(prev => ({ ...prev, [p._id]: [] }));
      setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
      setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));

      const pdfFile = files.find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) || files[0];
      const count = await getPdfPageCount(pdfFile);

      setFileMap(prev => ({ ...prev, [p._id]: pdfFile }));
      setPreviewMap(prev => ({ ...prev, [p._id]: URL.createObjectURL(pdfFile) }));
      setPageCountMap(prev => ({ ...prev, [p._id]: count }));
      const allPages = Array.from({ length: count }, (_, i) => i + 1);
      setSelectedPagesMap(prev => ({ ...prev, [p._id]: allPages }));
      setRangeInputMap(prev => ({ ...prev, [p._id]: count > 1 ? `1-${count}` : "1" }));
      setShowPreviewMap(prev => ({ ...prev, [p._id]: false }));
      setPageSelectorOpenMap(prev => ({ ...prev, [p._id]: count > 1 }));

      if (count > 1) {
        toast.info(`PDF has ${count} pages. You can select specific pages below.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process selected file");
    } finally {
      setProcessingId(null);
    }
  }

  async function uploadFileForPaper(p: Paper) {
    const file = fileMap[p._id];

    if (!file) {
      toast.error("Please select a PDF or image file first");
      return;
    }

    const totalPages = pageCountMap[p._id] || 1;
    const selectedPages = selectedPagesMap[p._id] || [];

    if (totalPages > 1 && selectedPages.length === 0) {
      toast.error("Please select at least 1 page to upload.");
      return;
    }

    setUploadingId(p._id);

    try {
      let fileToUpload = file;

      // Extract partial pages if user deselected some pages
      if (totalPages > 1 && selectedPages.length < totalPages) {
        toast.info(`Extracting ${selectedPages.length} selected pages...`);
        fileToUpload = await extractSelectedPages(file, selectedPages);
      }

      const exam_type = `${p.type}_${examTypeMap[p._id] || "regular"}`;

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("paper_id", p._id);
      formData.append("branch", branch);
      formData.append("sem", semester);
      formData.append("subject", subject);
      formData.append("year", String(p.year));
      formData.append("exam_type", exam_type);

      const res = await fetch(`${API_URL}/admin/upload-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setFileMap(prev => ({ ...prev, [p._id]: null }));
        setPreviewMap(prev => ({ ...prev, [p._id]: "" }));
        setShowPreviewMap(prev => ({ ...prev, [p._id]: false }));
        setPageCountMap(prev => ({ ...prev, [p._id]: 0 }));
        setSelectedPagesMap(prev => ({ ...prev, [p._id]: [] }));
        setPageSelectorOpenMap(prev => ({ ...prev, [p._id]: false }));
        setRangeInputMap(prev => ({ ...prev, [p._id]: "" }));
        setImageItemsMap(prev => ({ ...prev, [p._id]: [] }));
        setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
        setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
        setIsDraggingOverMap(prev => ({ ...prev, [p._id]: false }));

        const pageMsg =
          totalPages > 1 && selectedPages.length < totalPages
            ? ` (${selectedPages.length} pages extracted)`
            : "";
        toast.success(`PDF uploaded and updated successfully!${pageMsg}`);
        fetchPapers();
      } else {
        toast.error(json.message || "Upload failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Upload failed due to network error");
    } finally {
      setUploadingId(null);
    }
  }

  // Filtered papers
  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return papers;
    const q = searchQuery.toLowerCase();
    return papers.filter(
      p =>
        p.name?.toLowerCase().includes(q) ||
        String(p.year)?.includes(q) ||
        p.type?.toLowerCase().includes(q) ||
        p.paper_type?.toLowerCase().includes(q) ||
        p.subject_code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [papers, searchQuery]);

  // Selected subject object
  const currentSubjectObj = useMemo(
    () => subjects.find(s => s._id === subject || s.code === subject),
    [subjects, subject]
  );

  // Stats for the active subject
  const stats = useMemo(() => {
    const total = papers.length;
    const withPdf = papers.filter(p => !!p.paper_pdf).length;
    const missingPdf = total - withPdf;
    return { total, withPdf, missingPdf };
  }, [papers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080B14] text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superalpha")) {
    return null;
  }

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
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                Repository
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5 pt-1">
              <FileText className="w-7 h-7 text-indigo-400" />
              <span>Papers Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Filter by semester, branch, and subject to manage previous year question papers, upload official PDFs, and edit question banks.
            </p>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {subject && (
              <button
                onClick={fetchPapers}
                disabled={loadingPapers}
                title="Refresh papers list"
                className="p-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={loadingPapers ? "animate-spin text-indigo-400" : ""} />
              </button>
            )}

            <button
              disabled={!subject}
              onClick={() => {
                setEdit(null);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-purple-600"
            >
              <Plus size={16} />
              <span>Add Paper</span>
            </button>
          </div>
        </div>

        {/* ================= FILTER PANEL ================= */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-indigo-400" />
              <span>Academic Filter Hierarchy</span>
            </h2>
            {loadingBase && (
              <span className="text-xs text-indigo-400 flex items-center gap-1.5">
                <RefreshCw size={11} className="animate-spin" />
                Loading taxonomy...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* SEMESTER */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <GraduationCap size={13} className="text-indigo-400" />
                <span>1. Semester</span>
              </label>
              <select
                value={semester}
                onChange={e => {
                  setSemester(e.target.value);
                  setSubject("");
                }}
                className="w-full bg-[#0E1526] border border-slate-700/80 hover:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">Select Semester</option>
                {semesters.map(s => (
                  <option key={s.code} value={s.code}>
                    {formatSemesterLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* BRANCH */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <BookOpen size={13} className="text-purple-400" />
                <span>2. Branch</span>
              </label>
              <select
                value={branch}
                onChange={e => {
                  setBranch(e.target.value);
                  setSubject("");
                }}
                className="w-full bg-[#0E1526] border border-slate-700/80 hover:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.code} value={b.code}>
                    {formatBranchLabel(b)}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBJECT */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="text-emerald-400" />
                  <span>3. Subject</span>
                </span>
                {loadingSubjects && <span className="text-[10px] text-indigo-400">Loading...</span>}
              </label>
              <select
                value={subject}
                disabled={!semester || !branch || loadingSubjects}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#0E1526] border border-slate-700/80 hover:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!semester || !branch
                    ? "Select Semester & Branch first"
                    : subjects.length === 0
                    ? "No subjects found"
                    : "Select Subject"}
                </option>
                {subjects.map(s => {
                  const val = s._id || s.code;
                  return (
                    <option key={val} value={val}>
                      {s.short_name ? `${s.short_name} - ${s.code}` : s.code}
                      {s.full_name ? ` (${s.full_name})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* ACTIVE SUBJECT INFO CHIP */}
          {currentSubjectObj && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 font-semibold">
                  {currentSubjectObj.short_name || currentSubjectObj.code}
                </span>
                <span className="text-slate-300 font-medium">
                  {currentSubjectObj.full_name}
                </span>
                <span className="text-slate-500 font-mono">
                  (Code: {currentSubjectObj.code})
                </span>
              </div>

              {/* STATS */}
              <div className="flex items-center gap-3 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Total: <strong className="text-white">{stats.total}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  With PDF: <strong className="text-emerald-400">{stats.withPdf}</strong>
                </span>
                {stats.missingPdf > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Missing PDF: <strong className="text-amber-400">{stats.missingPdf}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= SEARCH & STATS BAR ================= */}
        {subject && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search papers by name, year, or type..."
                className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-white transition"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shadow-xs select-none">
                    Ctrl + F
                  </kbd>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 self-end sm:self-auto">
              Showing <strong className="text-white">{filteredPapers.length}</strong> of{" "}
              <strong className="text-white">{papers.length}</strong> papers
            </div>
          </div>
        )}

        {/* ================= PAPERS TABLE ================= */}
        {!subject ? (
          <div className="bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white">No Subject Selected</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Select a <strong>Semester</strong>, <strong>Branch</strong>, and <strong>Subject</strong> in the filter bar above to view, upload, and manage its question papers.
            </p>
          </div>
        ) : loadingPapers ? (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-300 font-medium">Loading question papers...</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0C1222] border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Paper Name & Questions</th>
                    <th className="py-3.5 px-4">Exam Type</th>
                    <th className="py-3.5 px-4">Year</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">PDF Status</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Upload Official PDF</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                  {filteredPapers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-sm font-medium text-slate-300">
                          {searchQuery ? "No papers match your search" : "No question papers found for this subject"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {searchQuery
                            ? "Try clearing the search query."
                            : "Click 'Add Paper' at the top to create the first question paper."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPapers.map(p => {
                      const hasPdf = Boolean(p.paper_pdf);
                      const isUploading = uploadingId === p._id;
                      const hasFile = Boolean(fileMap[p._id]);
                      const hasPreview = Boolean(previewMap[p._id]);
                      const isPreviewOpen = Boolean(showPreviewMap[p._id]);

                      return (
                        <tr
                          key={p._id}
                          className="hover:bg-slate-800/30 transition-colors group"
                        >
                          {/* 1. PAPER NAME (CLICK OPENS IN NEW TAB!) */}
                          <td className="py-4 px-4 align-top">
                            <div className="space-y-1 max-w-xs">
                              <a
                                href={`/admin/papers/${p._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open questions editor in new tab"
                                className="group/link inline-flex items-center gap-1.5 font-bold text-sm text-indigo-300 hover:text-indigo-100 transition-colors"
                              >
                                <span className="group-hover/link:underline underline-offset-2">
                                  {p.name}
                                </span>
                                <ExternalLink
                                  size={13}
                                  className="text-indigo-400/70 group-hover/link:text-indigo-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform shrink-0"
                                />
                              </a>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[11px] text-slate-500 font-mono">
                                  ID: {p._id.slice(-6)}
                                </p>
                                {p.subject_code && (
                                  <span
                                    title="Paper Subject Code"
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                                  >
                                    Code: {p.subject_code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. EXAM TYPE BADGES */}
                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-col items-start gap-1">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {p.type || "END-SEM"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize border ${
                                  p.paper_type === "special"
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : p.paper_type === "Supplementary"
                                    ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                {p.paper_type || "regular"}
                              </span>
                            </div>
                          </td>

                          {/* 3. YEAR */}
                          <td className="py-4 px-4 align-top font-bold text-slate-100 font-mono text-sm">
                            {p.year}
                          </td>

                          {/* 4. DESCRIPTION */}
                          <td className="py-4 px-4 align-top text-slate-400 max-w-xs">
                            <p className="line-clamp-2 text-xs">
                              {p.description || <span className="text-slate-600 italic">No description</span>}
                            </p>
                          </td>

                          {/* 5. PDF STATUS */}
                          <td className="py-4 px-4 align-top">
                            {hasPdf ? (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => window.open(p.paper_pdf, "_blank", "noopener,noreferrer")}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                                  title="Open PDF in new tab"
                                >
                                  <FileCheck size={13} className="text-emerald-400" />
                                  <span>View PDF</span>
                                  <ExternalLink size={11} className="text-emerald-400/80" />
                                </button>
                                <span className="block text-[10px] text-emerald-400/80">
                                  ✓ Available
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <FileWarning size={13} className="text-rose-400" />
                                <span>No PDF</span>
                              </div>
                            )}
                          </td>

                          {/* 6. UPLOAD WIDGET (PARTIAL PAGE SELECTION, MULTI-IMAGE DRAG/DROP & COMPRESSION) */}
                          <td className="py-4 px-4 align-top">
                            <div
                              tabIndex={0}
                              onClick={() => setActivePaperFocusId(p._id)}
                              onDragOver={e => {
                                e.preventDefault();
                                setIsDraggingOverMap(prev => ({ ...prev, [p._id]: true }));
                              }}
                              onDragLeave={() => setIsDraggingOverMap(prev => ({ ...prev, [p._id]: false }))}
                              onDrop={e => {
                                e.preventDefault();
                                setIsDraggingOverMap(prev => ({ ...prev, [p._id]: false }));
                                handleFilesDropped(p, e.dataTransfer.files);
                              }}
                              className={`border rounded-xl p-3 space-y-3 shadow-xs min-w-[310px] transition-all outline-none ${
                                isDraggingOverMap[p._id]
                                  ? "bg-indigo-950/40 border-dashed border-indigo-400 ring-2 ring-indigo-500/40"
                                  : activePaperFocusId === p._id
                                  ? "bg-[#0B1020] border-indigo-500/50 ring-1 ring-indigo-500/30"
                                  : "bg-[#0B1020] border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              {/* SELECT EXAM TYPE & CHOOSE FILE BUTTON */}
                              <div className="flex items-center gap-2">
                                <select
                                  onChange={e =>
                                    setExamTypeMap(prev => ({
                                      ...prev,
                                      [p._id]: e.target.value,
                                    }))
                                  }
                                  value={examTypeMap[p._id] || "regular"}
                                  className="bg-slate-900 border border-slate-700/80 text-slate-200 px-2.5 py-1 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="regular">Regular</option>
                                  <option value="special">Special</option>
                                  <option value="supplementary">Supplementary</option>
                                </select>

                                <label className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-1 rounded-lg transition active:scale-95">
                                  {processingId === p._id ? (
                                    <>
                                      <RefreshCw size={13} className="animate-spin text-indigo-400" />
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud size={13} />
                                      <span>{hasFile ? "Change File" : "Choose PDF / Imgs"}</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
                                    multiple
                                    hidden
                                    disabled={processingId === p._id || isUploading}
                                    onChange={e => {
                                      handleFilesSelected(p, e.target.files);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>

                              {/* DRAG & DROP OR PASTE HELPER */}
                              {isDraggingOverMap[p._id] ? (
                                <div className="text-center py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/15 border border-dashed border-indigo-400/50 rounded-lg animate-pulse">
                                  📥 Drop images or PDF here to attach!
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                                  <span className="flex items-center gap-1">
                                    <Copy size={11} className={activePaperFocusId === p._id ? "text-indigo-400" : "text-slate-500"} />
                                    <span>
                                      {activePaperFocusId === p._id ? (
                                        <strong className="text-indigo-300">Active for Ctrl + V</strong>
                                      ) : (
                                        "Click to paste (Ctrl + V)"
                                      )}
                                    </span>
                                  </span>
                                  <span className="text-slate-500">Drag & drop files</span>
                                </div>
                              )}

                              {/* 🖼️ MULTI-IMAGE THUMBNAIL STRIP & REARRANGE CONTROLS */}
                              {(imageItemsMap[p._id] || []).length > 0 && (
                                <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-2.5 space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                                      <ImageIcon size={13} className="text-indigo-400" />
                                      <span>
                                        {imageItemsMap[p._id].length} Image{imageItemsMap[p._id].length > 1 ? "s" : ""} (Pages)
                                      </span>
                                    </span>

                                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-300 hover:text-white cursor-pointer bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-2 py-0.5 rounded transition">
                                      <Plus size={11} />
                                      <span>Add More</span>
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/jpg"
                                        multiple
                                        hidden
                                        onChange={e => {
                                          if (e.target.files) appendImagesToPaper(p, Array.from(e.target.files));
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {/* Thumbnail strip */}
                                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[320px] scrollbar-thin">
                                    {imageItemsMap[p._id].map((item, idx) => (
                                      <div
                                        key={item.id}
                                        className="relative shrink-0 bg-slate-900 border border-slate-700/80 rounded-lg p-1 w-20 flex flex-col items-center gap-1"
                                      >
                                        <div className="relative w-full h-16 rounded overflow-hidden bg-black/60">
                                          <img
                                            src={item.preview}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                          />
                                          <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono font-bold text-white">
                                            P{idx + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation();
                                              removeSingleImage(p, idx);
                                            }}
                                            title="Remove this image"
                                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-rose-600/90 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition cursor-pointer"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>

                                        {/* Reorder Buttons */}
                                        <div className="flex items-center justify-between w-full px-0.5">
                                          <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={e => {
                                              e.stopPropagation();
                                              reorderImage(p, idx, idx - 1);
                                            }}
                                            title="Move earlier (Page Up)"
                                            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                          >
                                            <MoveLeft size={11} />
                                          </button>
                                          <span className="text-[9px] text-slate-400 font-mono">#{idx + 1}</span>
                                          <button
                                            type="button"
                                            disabled={idx === imageItemsMap[p._id].length - 1}
                                            onClick={e => {
                                              e.stopPropagation();
                                              reorderImage(p, idx, idx + 1);
                                            }}
                                            title="Move later (Page Down)"
                                            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                          >
                                            <MoveRight size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* SELECTED FILE INFO */}
                              {hasFile && (
                                <div className="space-y-2 pt-1 border-t border-slate-800">
                                  <div className="flex items-center justify-between text-[11px] gap-2">
                                    <span className="text-slate-300 font-medium truncate max-w-[170px]" title={fileMap[p._id]?.name}>
                                      📄 {fileMap[p._id]?.name}
                                    </span>
                                    <span className="text-slate-400 text-[10px] shrink-0 font-mono">
                                      {fileMap[p._id]?.size ? formatFileSize(fileMap[p._id]!.size) : ""}
                                    </span>
                                  </div>

                                  {/* ⚡ Compression badge or button */}
                                  {compressionStatsMap[p._id] ? (
                                    <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-[11px]">
                                      <div className="flex items-center gap-1.5 text-emerald-300">
                                        <Zap size={12} className="text-emerald-400 shrink-0" />
                                        <span>
                                          Reduced:{" "}
                                          <strong className="font-mono">{formatFileSize(compressionStatsMap[p._id]!.compressed)}</strong>{" "}
                                          <span className="text-emerald-400/80 font-mono text-[10px]">
                                            (-{compressionStatsMap[p._id]!.percent}%)
                                          </span>
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => revertCompression(p)}
                                        title="Revert back to uncompressed original"
                                        className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition cursor-pointer"
                                      >
                                        <RotateCcw size={10} />
                                        <span>Revert</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
                                      <span className="text-[10px] text-slate-400">Large PDF file?</span>
                                      <button
                                        type="button"
                                        disabled={isCompressingMap[p._id] || processingId === p._id}
                                        onClick={() => compressCurrentPdf(p)}
                                        title="Compress PDF pages while keeping text sharp and readable"
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2 py-0.5 rounded transition active:scale-95 cursor-pointer disabled:opacity-40"
                                      >
                                        {isCompressingMap[p._id] ? (
                                          <>
                                            <RefreshCw size={10} className="animate-spin text-amber-400" />
                                            <span>Compressing...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Zap size={10} className="text-amber-400" />
                                            <span>⚡ Reduce Size</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {/* ✂ INTERACTIVE PARTIAL PAGE SELECTION (IF MULTI-PAGE) */}
                                  {(pageCountMap[p._id] || 0) > 1 && (
                                    <div className="bg-[#0E1528] border border-indigo-500/25 rounded-xl p-2.5 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPageSelectorOpenMap(prev => ({
                                              ...prev,
                                              [p._id]: !prev[p._id],
                                            }))
                                          }
                                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
                                        >
                                          <Scissors size={13} className="text-indigo-400" />
                                          <span>
                                            Select Pages:{" "}
                                            <strong className="text-white">
                                              {(selectedPagesMap[p._id] || []).length}/{pageCountMap[p._id]}
                                            </strong>
                                          </span>
                                          {pageSelectorOpenMap[p._id] ? (
                                            <ChevronUp size={13} className="text-indigo-400" />
                                          ) : (
                                            <ChevronDown size={13} className="text-indigo-400" />
                                          )}
                                        </button>

                                        <span className="text-[10px] text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-md font-mono">
                                          {(selectedPagesMap[p._id] || []).length === pageCountMap[p._id]
                                            ? "All Pages"
                                            : `${(selectedPagesMap[p._id] || []).length} Chosen`}
                                        </span>
                                      </div>

                                      {/* EXPANDABLE PAGE SELECTOR */}
                                      {pageSelectorOpenMap[p._id] && (
                                        <div className="space-y-2.5 pt-1.5 border-t border-slate-800/80 text-xs">
                                          {/* QUICK PRESETS */}
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const total = pageCountMap[p._id];
                                                const all = Array.from({ length: total }, (_, i) => i + 1);
                                                setSelectedPagesMap(prev => ({ ...prev, [p._id]: all }));
                                                setRangeInputMap(prev => ({ ...prev, [p._id]: `1-${total}` }));
                                              }}
                                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                                                (selectedPagesMap[p._id] || []).length === pageCountMap[p._id]
                                                  ? "bg-indigo-600 text-white"
                                                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                              }`}
                                            >
                                              All ({pageCountMap[p._id]})
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPagesMap(prev => ({ ...prev, [p._id]: [1] }));
                                                setRangeInputMap(prev => ({ ...prev, [p._id]: "1" }));
                                              }}
                                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                                            >
                                              Page 1
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedPagesMap(prev => ({ ...prev, [p._id]: [] }));
                                                setRangeInputMap(prev => ({ ...prev, [p._id]: "" }));
                                              }}
                                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                                            >
                                              Clear
                                            </button>
                                          </div>

                                          {/* CLICKABLE PAGE CHIPS (IF <= 24 PAGES) */}
                                          {(pageCountMap[p._id] || 0) <= 24 && (
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                              {Array.from({ length: pageCountMap[p._id] || 0 }, (_, idx) => {
                                                const pageNum = idx + 1;
                                                const currentList = selectedPagesMap[p._id] || [];
                                                const isSelected = currentList.includes(pageNum);
                                                return (
                                                  <button
                                                    key={pageNum}
                                                    type="button"
                                                    onClick={() => {
                                                      const updated = isSelected
                                                        ? currentList.filter(n => n !== pageNum)
                                                        : [...currentList, pageNum].sort((a, b) => a - b);
                                                      setSelectedPagesMap(prev => ({ ...prev, [p._id]: updated }));
                                                      setRangeInputMap(prev => ({
                                                        ...prev,
                                                        [p._id]: formatPageRange(updated),
                                                      }));
                                                    }}
                                                    className={`min-w-[28px] h-6 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center cursor-pointer ${
                                                      isSelected
                                                        ? "bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400"
                                                        : "bg-slate-800/90 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                                                    }`}
                                                    title={`Click to ${isSelected ? "deselect" : "select"} page ${pageNum}`}
                                                  >
                                                    {pageNum}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* RANGE TEXT INPUT */}
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              placeholder="e.g. 1-3, 5"
                                              value={rangeInputMap[p._id] || ""}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setRangeInputMap(prev => ({ ...prev, [p._id]: val }));
                                                const parsed = parsePageRange(val, pageCountMap[p._id] || 1);
                                                setSelectedPagesMap(prev => ({ ...prev, [p._id]: parsed }));
                                              }}
                                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                            <span className="text-[10px] text-slate-500 shrink-0">Range</span>
                                          </div>

                                          {/* SELECTION SUMMARY */}
                                          <p className="text-[10px] text-slate-400 leading-tight">
                                            {(selectedPagesMap[p._id] || []).length === 0 ? (
                                              <span className="text-rose-400 font-semibold">⚠️ No pages selected</span>
                                            ) : (selectedPagesMap[p._id] || []).length === pageCountMap[p._id] ? (
                                              <span className="text-emerald-400">All {pageCountMap[p._id]} pages will be uploaded</span>
                                            ) : (
                                              <span>
                                                Will upload: <strong className="text-indigo-300 font-mono">{formatPageRange(selectedPagesMap[p._id] || [])}</strong> ({(selectedPagesMap[p._id] || []).length} pages)
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* TOGGLE PREVIEW BUTTON */}
                                  {hasPreview && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowPreviewMap(prev => ({
                                          ...prev,
                                          [p._id]: !prev[p._id],
                                        }))
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                                    >
                                      {isPreviewOpen ? <EyeOff size={12} /> : <Eye size={12} />}
                                      <span>{isPreviewOpen ? "Hide Preview" : "Inspect PDF Preview"}</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* IFRAME PREVIEW (COLLAPSIBLE) */}
                              {hasPreview && isPreviewOpen && (
                                <div className="rounded-lg overflow-hidden border border-slate-700 mt-2 bg-black">
                                  <iframe src={previewMap[p._id]} className="w-full h-[220px]" />
                                </div>
                              )}

                              {/* ACTIONS ROW: REMOVE & UPLOAD */}
                              <div className="flex items-center justify-between pt-1">
                                {hasFile ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFileMap(prev => ({ ...prev, [p._id]: null }));
                                      setPreviewMap(prev => ({ ...prev, [p._id]: "" }));
                                      setShowPreviewMap(prev => ({ ...prev, [p._id]: false }));
                                      setPageCountMap(prev => ({ ...prev, [p._id]: 0 }));
                                      setSelectedPagesMap(prev => ({ ...prev, [p._id]: [] }));
                                      setPageSelectorOpenMap(prev => ({ ...prev, [p._id]: false }));
                                      setRangeInputMap(prev => ({ ...prev, [p._id]: "" }));
                                      setImageItemsMap(prev => ({ ...prev, [p._id]: [] }));
                                      setOriginalUncompressedMap(prev => ({ ...prev, [p._id]: null }));
                                      setCompressionStatsMap(prev => ({ ...prev, [p._id]: null }));
                                    }}
                                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                                  >
                                    <X size={12} />
                                    <span>Clear</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500">PDF or Images</span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => uploadFileForPaper(p)}
                                  disabled={!hasFile || isUploading || processingId === p._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                  {isUploading ? (
                                    <>
                                      <RefreshCw size={12} className="animate-spin" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud size={13} />
                                      <span>Upload</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 7. ROW ACTIONS */}
                          <td className="py-4 px-4 align-top text-right">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                              {/* OPEN IN NEW TAB ACTION */}
                              <a
                                href={`/admin/papers/${p._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open paper questions in new tab"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-100 border border-indigo-500/20 transition cursor-pointer"
                              >
                                <span>Open</span>
                                <ExternalLink size={12} />
                              </a>

                              {/* EDIT ACTION */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEdit(p);
                                  setOpen(true);
                                }}
                                title="Edit paper details"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>

                              {/* DELETE ACTION */}
                              <button
                                type="button"
                                onClick={() => remove(p._id)}
                                title="Delete paper"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MODAL ================= */}
        {open && (
          <PaperModal
            subject={subject}
            subjectCode={currentSubjectObj?.code || ""}
            data={edit}
            onClose={() => setOpen(false)}
            onSaved={fetchPapers}
          />
        )}
      </div>
    </div>
  );
}

/* ================= MODERN MODAL ================= */

function PaperModal({
  subject,
  subjectCode = "",
  data,
  onClose,
  onSaved,
}: {
  subject: string;
  subjectCode?: string;
  data: Paper | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(data?.name || "");
  const [paperCode, setPaperCode] = useState(data?.subject_code || subjectCode || "");
  const [type, setType] = useState(data?.type || "END-SEM");
  const [paper_type, setpaper_type] = useState(data?.paper_type || "regular");
  const [year, setYear] = useState<number>(data?.year || new Date().getFullYear());
  const [desc, setDesc] = useState(data?.description || "");
  const [paper_pdf, setpaper_pdf] = useState(data?.paper_pdf || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Please enter a paper name");
      return;
    }
    if (!year) {
      toast.error("Please enter a valid year");
      return;
    }

    try {
      setSaving(true);
      const method = data ? "PUT" : "POST";
      const url = data
        ? `${API_URL}/admin/papers/${data._id}`
        : `${API_URL}/admin/papers`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          subject_id: subject,
          subject_code: paperCode.trim() || subjectCode || "",
          name: name.trim(),
          type,
          paper_type,
          year: Number(year),
          description: desc.trim(),
          paper_pdf: paper_pdf.trim(),
        }),
      });

      if (res.ok) {
        toast.success(data ? "Paper updated successfully" : "Paper created successfully");
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.detail || err?.message || "Failed to save paper");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving paper");
    } finally {
      setSaving(false);
    }
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0F1629] w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl p-6 space-y-5 text-slate-100 my-auto animate-scale-up"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {data ? "Edit Question Paper" : "Add New Question Paper"}
              </h3>
              <p className="text-xs text-slate-400">
                {data ? `Update metadata for ID: ${data._id.slice(-6)}` : "Create a new examination entry"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="space-y-4 text-xs">
          {/* PAPER NAME */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Paper Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Design & Analysis of Algorithms 2024"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
            />
          </div>

          {/* PAPER CODE & YEAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">
                  Paper Code
                </label>
                {subjectCode && paperCode !== subjectCode && (
                  <button
                    type="button"
                    onClick={() => setPaperCode(subjectCode)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline underline-offset-1"
                    title={`Reset to subject default: ${subjectCode}`}
                  >
                    Reset ({subjectCode})
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder={subjectCode || "e.g. CS401"}
                value={paperCode}
                onChange={e => setPaperCode(e.target.value)}
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition font-mono uppercase"
              />
              <p className="text-[10px] text-slate-500">
                Default: {subjectCode || "subject code"}. Editable per paper.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Exam Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={2000}
                max={2035}
                value={year}
                onChange={e => setYear(+e.target.value)}
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* DUAL SELECT: EXAM TYPE & PAPER TYPE */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Exam Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="END-SEM">END-SEM</option>
                <option value="MID-SEM">MID-SEM</option>
                <option value="NPTEL">NPTEL</option>
                <option value="QUIZ">QUIZ</option>
                <option value="PRACTICE">PRACTICE</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Paper Category</label>
              <select
                value={paper_type}
                onChange={e => setpaper_type(e.target.value)}
                className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="regular">Regular</option>
                <option value="special">Special</option>
                <option value="Supplementary">Supplementary</option>
              </select>
            </div>
          </div>

          {/* PDF LINK (OPTIONAL) */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span>PDF URL Link (Optional)</span>
              <span className="text-slate-500 font-normal">Direct Cloudinary or Drive URL</span>
            </label>
            <input
              type="text"
              placeholder="https://res.cloudinary.com/... or Google Drive URL"
              value={paper_pdf}
              onChange={e => setpaper_pdf(e.target.value)}
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Any remarks, syllabus code, or notes about this question paper..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full bg-[#080D1A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition resize-none"
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>{data ? "Update Paper" : "Create Paper"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
