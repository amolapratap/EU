"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import AiExtractionModal from "../components/AiExtractionModal";
import AiCompareSolutionModal from "../components/AiCompareSolutionModal";
import { Sparkles, FileText, Eye, RotateCcw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import OptionMathText from "@/components/pyq/OptionMathText";

function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return null;
  return (
    <div className={`prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-slate-800 border border-slate-800 text-xs text-left">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-slate-800/80 px-3 py-2 font-semibold text-slate-200 border border-slate-700/60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-slate-300 border border-slate-800/60">{children}</td>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[12px]">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Safely extracts admin IDs from an entity (question, paper, sub-question).
 * In MongoDB, admin_userids may be:
 * - A single string (e.g. "AR104")
 * - An array of strings (e.g. ["AR104", "AR101"])
 * - Comma-separated string (e.g. "AR104, AR101")
 * - Stored under admin_userids, admin_userid, admin_id, or created_by
 */
function extractAdminUserids(item: any): string[] {
  if (!item) return [];
  const raw =
    item.admin_userids ??
    item.admin_userid ??
    item.admin_id ??
    item.created_by;

  if (!raw) return [];

  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map(id => (typeof id === "string" ? id.trim() : String(id || "").trim()))
          .filter(Boolean)
      )
    );
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map(x => String(x || "").trim()).filter(Boolean)));
        }
      } catch {}
    }
    if (trimmed.includes(",")) {
      return Array.from(new Set(trimmed.split(",").map(s => s.trim()).filter(Boolean)));
    }
    return [trimmed];
  }

  if (typeof raw === "number") {
    return [String(raw)];
  }

  return [];
}

export default function AdminPaperQuestionsPage() {
  const { paper_id } = useParams<{ paper_id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [paper, setPaper] = useState<any>({
    name: "",
    subject_code: "",
    year: "",
    paper_pdf: "",
    questions: [],
  });

  const [editor, setEditor] = useState<any | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [solvingQuestionNo, setSolvingQuestionNo] = useState<any | null>(null);
  const [compareModalQuestion, setCompareModalQuestion] = useState<any | null>(null);

  function handleOpenCompareSolveModal(q: any) {
    setCompareModalQuestion(q);
  }
  const [withWatermark, setWithWatermark] = useState(true);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const bottomActionsRef = useRef<HTMLDivElement | null>(null);

  /* ADMIN GUARD */
  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superalpha"))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* LOAD PAPER */
  useEffect(() => {
    if (paper_id) fetchPaper();
  }, [paper_id]);

  /* AUTO-OPEN AI MODAL IF QUERY PARAM PRESENT */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openAiModal") === "true") {
        setAiModalOpen(true);
      }
    }
  }, []);

  /* SCROLL TO EDITOR WHEN OPENED OR CHANGED */
  useEffect(() => {
    if (editor && editorSectionRef.current) {
      editorSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [editor]);

  function openEditorAndScroll(qData: any, instant = false) {
    setEditor(qData);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const target = editorSectionRef.current || bottomActionsRef.current;
        target?.scrollIntoView({
          behavior: instant ? "instant" : "smooth",
          block: "start",
        });
      }, 40);
    });
  }

  function jumpToQuestion(q_no: number) {
    const el = document.getElementById(`question-card-${q_no}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function jumpToBottomInstant() {
    const target = editorSectionRef.current || bottomActionsRef.current;
    target?.scrollIntoView({ behavior: "instant", block: "start" });
  }

  async function fetchPaper() {
    const res = await fetch(`${API_URL}/admin/paper/${paper_id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const json = await res.json();

    setPaper({
      ...json.data,
      questions: Array.isArray(json.data?.questions)
        ? json.data.questions
        : [],
    });
  }

  function nextQno() {
    if (!paper.questions.length) return 1;
    return Math.max(...paper.questions.map((q: any) => q.q_no)) + 1;
  }

  function handleGeneratePdfClick() {
    if (!paper.questions || paper.questions.length === 0) {
      toast.error("Please add questions to this paper before generating a PDF.");
      return;
    }

    // Open modal to ask admin about watermark logo (and warn if PDF already exists)
    confirmDialogRef.current?.showModal();
  }

  function handleDialogBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    // Fallback for browsers without native <dialog closedby="any"> support
    const dialog = confirmDialogRef.current;
    if (!dialog || e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isDialogContent =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isDialogContent) {
      dialog.close();
    }
  }

  async function executeGeneratePdf() {
    confirmDialogRef.current?.close();
    setGeneratingPdf(true);
    toast.loading("Generating university format PDF & uploading to Cloudinary...", {
      id: "generate-paper-pdf",
    });

    try {
      const res = await fetch(
        `${API_URL}/admin/papers/${paper_id}/generate-pdf?with_watermark=${withWatermark}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ with_watermark: withWatermark }),
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.detail || json.error || "Failed to generate PDF");
      }

      setPaper((prev: any) => ({
        ...prev,
        paper_pdf: json.data?.url || prev.paper_pdf,
      }));

      toast.success("Question paper PDF generated & saved to Cloudinary!", {
        id: "generate-paper-pdf",
      });
    } catch (err: any) {
      toast.error(err.message || "Error generating PDF", {
        id: "generate-paper-pdf",
      });
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function removeMain(q_no: number) {
    if (!window.confirm(`Delete Question Q${q_no}?`)) return;

    // ✅ Optimistic UI
    setPaper((prev: any) => ({
      ...prev,
      questions: prev.questions.filter((q: any) => q.q_no !== q_no),
    }));

    await fetch(`${API_URL}/admin/papers/${paper_id}/questions/${q_no}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  
  if (!user || (user.role !== "admin" && user.role !== "superalpha")) return null;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 [color-scheme:dark]">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0D1322]/90 backdrop-blur-md">
        <div className="w-full px-3 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {paper.name || "Untitled Paper"}
              </h1>
              {paper.year && (
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  {paper.year}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Subject Code: <strong className="text-slate-200 font-medium">{paper.subject_code || "N/A"}</strong></span>
              <span>•</span>
              <span>Total Questions: <strong className="text-slate-200 font-medium">{paper.questions.length}</strong></span>
              {(() => {
                const paperAdmins = extractAdminUserids(paper);
                if (paperAdmins.length === 0) return null;
                return (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-slate-500">Paper by:</span>
                      {paperAdmins.map((id: string, i: number) => (
                        <span
                          key={`${id}-${i}`}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-semibold"
                          title={`Admin ID: ${id}`}
                        >
                          {id}
                        </span>
                      ))}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {paper.paper_pdf && (
              <a
                href={paper.paper_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-indigo-500/35 bg-indigo-500/10 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/20 transition"
              >
                📄 View Existing PDF
              </a>
            )}

            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✨ AI Auto-Extract</span>
            </button>

            <button
              type="button"
              onClick={handleGeneratePdfClick}
              disabled={generatingPdf || paper.questions.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-950/50 transition disabled:opacity-40 cursor-pointer"
            >
              {generatingPdf
                ? "Generating PDF..."
                : paper.paper_pdf
                ? "⚡ Regenerate Paper PDF"
                : "⚡ Generate Paper PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* GENERATE PDF OPTIONS & CONFIRMATION DIALOG */}
      <dialog
        ref={confirmDialogRef}
        // @ts-ignore - closedby is a modern HTML standard attribute
        closedby="any"
        aria-labelledby="pdf-confirm-title"
        onClick={handleDialogBackdropClick}
        className="m-auto rounded-2xl bg-[#111827] text-slate-100 border border-slate-700/80 p-0 shadow-2xl max-w-md w-full backdrop:bg-black/70 backdrop:backdrop-blur-xs"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="pdf-confirm-title"
              className={`text-base font-bold ${
                paper.paper_pdf ? "text-amber-400" : "text-indigo-400"
              }`}
            >
              {paper.paper_pdf
                ? "⚠️ PDF Already Exists"
                : "📄 Generate Question Paper PDF"}
            </h2>
            <button
              type="button"
              onClick={() => confirmDialogRef.current?.close()}
              className="text-slate-400 hover:text-white text-sm cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {paper.paper_pdf ? (
            <p className="text-sm text-slate-300 leading-relaxed">
              A question paper PDF already exists for{" "}
              <span className="font-semibold text-white">
                {paper.name} ({paper.year})
              </span>
              . Generating a new PDF will build the university exam paper from the
              saved questions (without solutions), overwrite the file in Cloudinary,
              and update the database link.
            </p>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">
              Generate the Bihar Engineering University format question paper PDF for{" "}
              <span className="font-semibold text-white">
                {paper.name} ({paper.year})
              </span>{" "}
              and upload it to Cloudinary.
            </p>
          )}

          {paper.paper_pdf && (
            <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 truncate">
                Current PDF is stored on Cloudinary
              </span>
              <a
                href={paper.paper_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:underline font-medium ml-3 shrink-0"
              >
                Open Current PDF ↗
              </a>
            </div>
          )}

          {/* WATERMARK LOGO CHOICE */}
          <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-2.5">
            <p className="text-xs font-semibold text-slate-200">
              Add Alpha Result Watermark Logo?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setWithWatermark(true)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition cursor-pointer ${
                  withWatermark
                    ? "border-indigo-500 bg-indigo-500/20 text-white"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="font-semibold">✅ Yes, Add Logo</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Soft watercolor logo in center
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWithWatermark(false)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition cursor-pointer ${
                  !withWatermark
                    ? "border-indigo-500 bg-indigo-500/20 text-white"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="font-semibold">🚫 No Watermark</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Clean paper without center logo
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => confirmDialogRef.current?.close()}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 text-xs font-medium hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeGeneratePdf}
              disabled={generatingPdf}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer ${
                paper.paper_pdf
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {generatingPdf
                ? "Generating..."
                : paper.paper_pdf
                ? "Yes, Overwrite & Generate"
                : "Generate & Upload PDF"}
            </button>
          </div>
        </div>
      </dialog>

      <AiExtractionModal
        paper={paper}
        paperId={paper_id}
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSaved={fetchPaper}
      />

      <AiCompareSolutionModal
        paper={paper}
        paperId={paper_id}
        question={compareModalQuestion}
        isOpen={Boolean(compareModalQuestion)}
        onClose={() => setCompareModalQuestion(null)}
        onSaved={async () => {
          await fetchPaper();
          setCompareModalQuestion(null);
        }}
      />

      <main className="w-full px-3 sm:px-5 py-6 space-y-5">
        {paper.questions.length > 0 && (
          <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
                Quick Jump:
              </span>
              {paper.questions.map((q: any, idx: number) => (
                <button
                  key={`jump-${q.q_no}-${idx}`}
                  type="button"
                  onClick={() => jumpToQuestion(q.q_no)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-500/20 border border-slate-700/80 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 hover:text-indigo-200 transition cursor-pointer"
                >
                  Q{q.q_no}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => openEditorAndScroll({ q_no: nextQno() }, true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                + Add Question (Q{nextQno()})
              </button>

              <button
                type="button"
                onClick={jumpToBottomInstant}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200 text-xs font-medium transition cursor-pointer"
                title="Jump instantly to bottom"
              >
                ⬇ Bottom
              </button>
            </div>
          </div>
        )}

        {paper.questions.length === 0 && (
          <div className="p-10 text-center text-slate-400 bg-[#111827] border border-slate-800/90 rounded-2xl">
            No questions added yet. Click <strong>+ Add Question</strong> below to begin.
          </div>
        )}

        {paper.questions.map((q: any, idx: number) => {
          const hasSingleBlocks =
            Array.isArray(q.solution_blocks) &&
            q.solution_blocks.some(
              (b: any) =>
                (b.type === "text" && b.content?.trim()) ||
                (b.type === "image" && b.image_url)
            );

          return (
          <div
            id={`question-card-${q.q_no}`}
            key={`${q.q_no}-${idx}`}
            className="bg-[#111827] border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-5 sm:p-6 scroll-mt-24 shadow-sm transition-colors"
          >
            {/* QUESTION CARD HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-sm">
                  Q{q.q_no}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                  {q.marks} Marks
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-300 text-xs font-medium capitalize">
                  {q.structure} • {q.nature}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {(() => {
                  const directAdmins = extractAdminUserids(q);
                  const admins = directAdmins.length > 0 ? directAdmins : extractAdminUserids(paper);
                  if (admins.length === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1" title="Question author / contributor">
                      <span className="text-slate-500 font-medium">by:</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {admins.map((id: string, i: number) => (
                          <span
                            key={`${id}-${i}`}
                            className="inline-block px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-semibold"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setCompareModalQuestion(q)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Compare & generate AI solution for this question"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>✨ AI Solve</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openEditorAndScroll(JSON.parse(JSON.stringify(q)))
                  }
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 text-xs font-semibold transition cursor-pointer"
                >
                  ✎ Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeMain(q.q_no)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-semibold transition cursor-pointer"
                >
                  🗑 Delete
                </button>
              </div>
            </div>

            {q.heading && (
              <div className="mt-4 px-3.5 py-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 text-sm font-semibold">
                {q.heading}
              </div>
            )}

            {/* SINGLE QUESTION */}
            {q.structure === "single" && (
              <div className="mt-4 space-y-4">
                {/* QUESTION TEXT */}
                <div className="text-slate-100 text-[15px] leading-relaxed">
                  <MarkdownContent content={q.question_md} />
                </div>

                {/* SINGLE QUESTION OPTIONS (IF OBJECTIVE) */}
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((op: string, i: number) => {
                        const isCorrect = typeof q.correct_index === "number" && i === q.correct_index;
                        return (
                          <li
                            key={i}
                            className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-between gap-2 ${
                              isCorrect
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium"
                                : "bg-slate-900/60 border-slate-800 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <strong className="mr-1 text-slate-400 shrink-0">
                                {String.fromCharCode(65 + i)}.
                              </strong>
                              <div className="flex-1 min-w-0">
                                <OptionMathText text={op} />
                              </div>
                            </div>
                            {isCorrect && (
                              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                ✓ Correct
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {typeof q.correct_index === "number" && q.correct_index >= 0 && (
                      <p className="text-xs text-emerald-400 font-medium">
                        Correct Option: Option {String.fromCharCode(65 + q.correct_index)} (#{q.correct_index + 1})
                      </p>
                    )}
                  </div>
                )}

                {/* SOLUTION BLOCKS OR LEGACY SOLUTION */}
                {hasSingleBlocks ? (
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 border-l-4 border-l-emerald-500 p-4 space-y-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      ✓ Solution
                    </div>

                    {q.solution_blocks.map((block: any, bIdx: number) => (
                      <div key={block.id || bIdx}>
                        {block.type === "text" && block.content && (
                          <MarkdownContent content={block.content} />
                        )}

                        {block.type === "image" && (
                          <div className="space-y-2 pt-1">
                            <img
                              src={block.image_url}
                              alt="solution"
                              className="rounded-xl border border-slate-700/80 max-h-[500px] bg-black/30"
                            />
                            {block.caption && (
                              <p className="text-xs text-slate-400 italic">
                                {block.caption}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : q.solution_md?.trim() ? (
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 border-l-4 border-l-emerald-500 p-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      ✓ Solution
                    </div>
                    <MarkdownContent content={q.solution_md} />
                  </div>
                ) : null}
              </div>
            )}

            {/* MULTI SUB-QUESTIONS */}
            {Array.isArray(q.sub_questions) && q.sub_questions.length > 0 && (
              <div className="mt-4 space-y-4">
                {q.sub_questions.map((sq: any) => {
                  const hasSubBlocks =
                    Array.isArray(sq.solution_blocks) &&
                    sq.solution_blocks.some(
                      (b: any) =>
                        (b.type === "text" && b.content?.trim()) ||
                        (b.type === "image" && b.image_url)
                    );
                  const hasSubSolution = hasSubBlocks || Boolean(sq.solution_md?.trim());
                  const hasValidCorrectIndex =
                    typeof sq.correct_index === "number" &&
                    sq.correct_index >= 0 &&
                    !Number.isNaN(sq.correct_index);

                  return (
                    <div
                      key={sq.sq_no}
                      className="rounded-xl bg-[#0B101D] border border-slate-800/90 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-slate-100 text-sm sm:text-[15px] leading-relaxed flex items-start gap-2 flex-1">
                          <span className="font-bold text-indigo-300 shrink-0 mt-0.5">
                            ({sq.sq_no})
                          </span>
                          <MarkdownContent content={sq.question_md} className="flex-1" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {(() => {
                            const directSq = extractAdminUserids(sq);
                            const sqAdmins =
                              directSq.length > 0
                                ? directSq
                                : extractAdminUserids(q).length > 0
                                ? extractAdminUserids(q)
                                : extractAdminUserids(paper);
                            if (sqAdmins.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <span className="text-slate-500 font-medium">by:</span>
                                {sqAdmins.map((id: string, i: number) => (
                                  <span
                                    key={`${id}-${i}`}
                                    className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold"
                                  >
                                    {id}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          {sq.marks && (
                            <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                              {sq.marks} Marks
                            </span>
                          )}
                        </div>
                      </div>

                      {Array.isArray(sq.options) && sq.options.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sq.options.map((op: string, i: number) => {
                              const isCorrect = hasValidCorrectIndex && i === sq.correct_index;
                              return (
                                <li
                                  key={i}
                                  className={`px-3 py-2 rounded-lg border text-sm flex items-center justify-between gap-2 ${
                                    isCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium"
                                      : "bg-slate-900/60 border-slate-800 text-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <strong className="mr-1 text-slate-400 shrink-0">
                                      {String.fromCharCode(65 + i)}.
                                    </strong>
                                    <div className="flex-1 min-w-0">
                                      <OptionMathText text={op} />
                                    </div>
                                  </div>
                                  {isCorrect && (
                                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>

                          {hasValidCorrectIndex && (
                            <p className="text-xs text-emerald-400 font-medium">
                              Correct Option: Option {String.fromCharCode(65 + sq.correct_index)} (#{sq.correct_index + 1})
                            </p>
                          )}
                        </div>
                      )}

                      {hasSubSolution && (
                        <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 border-l-4 border-l-emerald-500 p-3.5 space-y-3">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            ✓ Solution
                          </div>

                          {hasSubBlocks ? (
                            <div className="space-y-3">
                              {sq.solution_blocks.map((block: any) => (
                                <div key={block.id}>
                                  {block.type === "text" && block.content && (
                                    <MarkdownContent content={block.content} />
                                  )}

                                  {block.type === "image" && (
                                    <div className="space-y-2 pt-1">
                                      <img
                                        src={block.image_url}
                                        alt="solution"
                                        className="rounded-xl border border-slate-700/80 max-h-[500px] bg-black/30"
                                      />
                                      {block.caption && (
                                        <p className="text-xs text-slate-400 italic">
                                          {block.caption}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : sq.solution_md ? (
                            <MarkdownContent content={sq.solution_md} />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}

        <div ref={editorSectionRef} className="scroll-mt-24">
          {editor && (
            <QuestionEditor
              key={`${editor.q_no}-${editor.structure ? "edit" : "new"}`}
              paper={paper}
              paperId={paper_id}
              data={editor}
              onClose={() => setEditor(null)}
              onSaved={fetchPaper}
            />
          )}
        </div>

        <div ref={bottomActionsRef} className="flex flex-wrap items-center justify-between gap-4 pt-2 scroll-mt-24">
          <button
            type="button"
            onClick={() => openEditorAndScroll({ q_no: nextQno() })}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            + Add Question (Q{nextQno()})
          </button>

          {paper.questions.length > 2 && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              ⬆ Back to Top
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/* =====================================================
   QUESTION EDITOR
===================================================== */

async function uploadSolutionImage(
  file: File,
  public_id: string
) {

  const formData = new FormData();

  formData.append("file", file);
  formData.append("public_id", public_id);

  const res = await fetch(
    `${API_URL}/admin/upload-solution-image`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },

      body: formData,
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.detail || "Upload failed");
  }

  return json;
}

function initSolutionBlocks(
  blocks: any[] | undefined,
  legacyMd: string | undefined
) {
  const nonEmptyBlocks = Array.isArray(blocks)
    ? blocks.filter(
        (b: any) =>
          (b.type === "text" && b.content?.trim()) ||
          (b.type === "image" && b.image_url)
      )
    : [];

  if (nonEmptyBlocks.length > 0) {
    return blocks!.map((b: any) => ({
      ...b,
      id: b.id || crypto.randomUUID(),
    }));
  }

  if (typeof legacyMd === "string" && legacyMd.trim().length > 0) {
    return [
      {
        id: crypto.randomUUID(),
        type: "text",
        content: legacyMd,
      },
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      type: "text",
      content: "",
    },
  ];
}

function QuestionEditor({ paper, paperId, data, onClose, onSaved }: any) {
  const isEdit = !!data.structure;

  const [qNo] = useState(data.q_no);
  const [marks, setMarks] = useState(data.marks || "");
  const [structure, setStructure] = useState(data.structure || "");
  const [nature, setNature] = useState(data.nature || "");
  const [heading, setHeading] = useState(data.heading || "");
  const [question, setQuestion] = useState(data.question_md || "");
  const [solution, setSolution] = useState(data.solution_md || "");
  const [subs, setSubs] = useState<any[]>(() =>
    (data.sub_questions || []).map((s: any) => ({
      ...s,
      solution_blocks: initSolutionBlocks(s.solution_blocks, s.solution_md),
    }))
  );

  const [solutionBlocks, setSolutionBlocks] = useState<any[]>(() =>
    initSolutionBlocks(data.solution_blocks, data.solution_md)
  );

  const [aiSolvingInEditor, setAiSolvingInEditor] = useState(false);
  const [showPdfInEditor, setShowPdfInEditor] = useState(false);
  const [adminPromptInEditor, setAdminPromptInEditor] = useState("");
  const [showPromptPopup, setShowPromptPopup] = useState(false);
  const [targetSqInEditor, setTargetSqInEditor] = useState("all");
  const [visualTypeInEditor, setVisualTypeInEditor] = useState<"image" | "svg" | "none">("svg");
  const [showLivePreview, setShowLivePreview] = useState(false);

  async function handleAiGenerateInEditor(promptText?: string, targetSq?: string) {
    const finalPrompt = (promptText !== undefined ? promptText : adminPromptInEditor).trim();
    const finalTarget = targetSq !== undefined ? targetSq : targetSqInEditor;

    setAiSolvingInEditor(true);
    toast.loading(`Generating solution with AI for Q${qNo}...`, { id: `editor-solve-${qNo}` });

    try {
      const payload: any = {
        nature,
        structure,
        question_md: question,
        q_no: qNo,
        marks,
        options: data.options || [],
        sub_questions: subs,
        save_to_db: false,
        admin_prompt: finalPrompt || undefined,
        visual_type: visualTypeInEditor,
      };

      if (structure === "multi" && finalTarget !== "all") {
        payload.sq_no = finalTarget;
      }

      const res = await fetch(`${API_URL}/admin/papers/${paperId}/ai-solve-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.detail || "AI solution generation failed");
      }

      if (structure === "multi" && json.sub_questions) {
        setSubs(
          json.sub_questions.map((s: any) => ({
            ...s,
            solution_blocks: initSolutionBlocks(s.solution_blocks, s.solution_md),
          }))
        );
      } else if (nature === "objective" && json.objective_solution) {
        setSolution(json.objective_solution.explanation || "");
      } else if (json.solution_blocks) {
        setSolutionBlocks(initSolutionBlocks(json.solution_blocks, ""));
      }

      setShowPromptPopup(false);
      toast.success(`AI Solution generated for Q${qNo}! Inspect and save.`, {
        id: `editor-solve-${qNo}`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate solution", {
        id: `editor-solve-${qNo}`,
      });
    } finally {
      setAiSolvingInEditor(false);
    }
  }


  useEffect(() => {
    if (structure === "single") setNature("subjective");
  }, [structure]);

  function canSave() {
    if (!marks || !structure) return false;
    if (structure === "single") return !!question;
    // if (!heading || !nature || subs.length === 0) return false;
    if (!nature || subs.length === 0) return false;
    return subs.every(
      s =>
        s.marks &&
        s.question_md &&
        (nature !== "objective" ||
          (s.options?.every((o: string) => o) &&
            typeof s.correct_index === "number" &&
            s.correct_index >= 0))
    );
  }

  
  function reIndex(list: any[]) {
    return list.map((s, i) => ({
      ...s,
      sq_no: String.fromCharCode(97 + i),
    }));
  }

  function addSub(type: "objective" | "subjective") {
    setSubs(prev =>
      reIndex([
        ...prev,
        {
          sq_no: "",
          marks: "",
          question_md: "",
          ...(type === "objective"
            ? {
                options: ["", "", "", ""],
                correct_index: null,
                solution_md: "",
              }
            : {
                solution_md: "",
                solution_blocks: [
                  {
                    id: crypto.randomUUID(),
                    type: "text",
                    content: "",
                  },
                ],
              }),
        },
      ])
    );
  }

  function updateSub(i: number, patch: any) {
    setSubs(prev =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  }

  function removeSub(i: number) {
    setSubs(prev => reIndex(prev.filter((_, idx) => idx !== i)));
  }

  // New for solution_block for single type
  function addTextBlock() {

    setSolutionBlocks(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "",
      },
    ]);
  }
  
  async function addImageBlock(file: File) {
  
    try {
  
      const imageIndex =
        solutionBlocks.filter(
          b => b.type === "image"
        ).length + 1;
  
  
      const public_id =
        `solutions/${paper.subject_code}` +
        `/q_${qNo}` +
        `/img_${imageIndex}`;
  
  
      toast.loading("Uploading image...", {
        id: "solution-upload"
      });
  
      const res = await uploadSolutionImage(
        file,
        public_id
      );

      setSolutionBlocks(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
  
          type: "image",
  
          image_url: res.image_url,
  
          public_id: res.public_id,
  
          caption: "",
        },
      ]);
  
  
      toast.success("Image uploaded", {
        id: "solution-upload"
      });
  
    } catch (err: any) {
  
      toast.error(
        err.message || "Upload failed"
      );
    }
  }
  
  
  function updateBlock(
    id: string,
    patch: any
  ) {
  
    setSolutionBlocks(prev =>
      prev.map(block =>
        block.id === id
          ? { ...block, ...patch }
          : block
      )
    );
  }
  
  
  function removeBlock(id: string) {
  
    setSolutionBlocks(prev =>
      prev.filter(block => block.id !== id)
    );
  }






  // New for solution_block for multi type*sub-quetion)
  function addSubTextBlock(subIndex: number) {

    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
          ...sub,
  
          solution_blocks: [
            ...(sub.solution_blocks || []),
  
            {
              id: crypto.randomUUID(),
  
              type: "text",
  
              content: "",
            },
          ],
        };
      })
    );
  }
  
  
  
  async function addSubImageBlock(
    subIndex: number,
    sq_no: string,
    file: File
  ) {
  
    try {
  
      const sub = subs[subIndex];
  
      const imageIndex =
        (sub.solution_blocks || []).filter(
          (b: any) => b.type === "image"
        ).length + 1;
  
  
      const public_id =
        `solutions/${paper.subject_code}` +
        `/q_${qNo}` +
        `/sub_${sq_no}` +
        `/img_${imageIndex}`;
  
  
      toast.loading("Uploading image...", {
        id: "sub-upload"
      });
  
  
      const res = await uploadSolutionImage(
        file,
        public_id
      );
  
  
      setSubs(prev =>
        prev.map((sub, i) => {
  
          if (i !== subIndex) return sub;
  
          return {
            ...sub,
  
            solution_blocks: [
              ...(sub.solution_blocks || []),
  
              {
                id: crypto.randomUUID(),
  
                type: "image",
  
                image_url: res.image_url,
  
                public_id: res.public_id,
  
                caption: "",
              },
            ],
          };
        })
      );
  
  
      toast.success("Image uploaded", {
        id: "sub-upload"
      });
  
    } catch (err: any) {
  
      toast.error(
        err.message || "Upload failed"
      );
    }
  }
  
  
  
  function updateSubBlock(
    subIndex: number,
    blockId: string,
    patch: any
  ) {
  
    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
  
          ...sub,
  
          solution_blocks:
            sub.solution_blocks.map((block: any) =>
  
              block.id === blockId
                ? { ...block, ...patch }
                : block
            ),
        };
      })
    );
  }
  
  
  
  function removeSubBlock(
    subIndex: number,
    blockId: string
  ) {
  
    setSubs(prev =>
      prev.map((sub, i) => {
  
        if (i !== subIndex) return sub;
  
        return {
  
          ...sub,
  
          solution_blocks:
            sub.solution_blocks.filter(
              (block: any) =>
                block.id !== blockId
            ),
        };
      })
    );
  }



  const [dragTarget, setDragTarget] = useState<string | null>(null);

  async function handlePasteClipboardEvent(
    e: React.ClipboardEvent,
    onUploadFile: (file: File) => Promise<void>
  ) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const ext = blob.type.split("/")[1] || "png";
          const file = new File([blob], `pasted-solution-${Date.now()}.${ext}`, {
            type: blob.type,
          });
          await onUploadFile(file);
          return;
        }
      }
    }
  }

  async function handlePasteButtonClick(
    onUploadFile: (file: File) => Promise<void>
  ) {
    try {
      if (!navigator.clipboard?.read) {
        toast.error("Please click inside the solution box and press Ctrl+V to paste image.");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `pasted-solution-${Date.now()}.${ext}`, {
            type: imageType,
          });
          await onUploadFile(file);
          return;
        }
      }
      toast.error("No copied image found in clipboard.");
    } catch {
      toast.error("Clipboard permission denied — press Ctrl+V inside the solution box instead.");
    }
  }

  async function handleDropFiles(
    e: React.DragEvent,
    onUploadFile: (file: File) => Promise<void>
  ) {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);

    const files = Array.from(e.dataTransfer?.files || []).filter(f =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) {
      toast.error("Please drop an image file (PNG, JPG, WEBP).");
      return;
    }

    for (const file of files) {
      await onUploadFile(file);
    }
  }

  async function save() {
    if (!canSave()) {
      alert("Fill all mandatory fields");
      return;
    }

    const payload: any = {
      q_no: qNo,
      marks: Number(marks),
      structure,
      nature,
    };

    if (structure === "single") {
      payload.question_md = question;
      // payload.solution_md = solution;
      // payload.solution_md = solution;
    if (solutionBlocks.length > 0) {
      payload.solution_blocks = solutionBlocks;
    }

    } else {
      payload.heading = heading;
      payload.sub_questions = subs;
    }

    const url = isEdit
      ? `${API_URL}/admin/papers/${paperId}/questions/${qNo}`
      : `${API_URL}/admin/papers/${paperId}/questions`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.detail || json.message || "Failed to save question");
      return;
    }

    toast.success(isEdit ? `Question Q${qNo} updated successfully!` : `Question Q${qNo} added!`);
    await onSaved();
    onClose();
  }


  useEffect(() => {
    if (
      structure === "single" &&
      nature === "subjective" &&
      solutionBlocks.length === 0
    ) {
      setSolutionBlocks(initSolutionBlocks(data.solution_blocks, data.solution_md));
    }

    if (structure === "multi" && nature === "subjective") {
      setSubs(prev =>
        prev.map(s => ({
          ...s,
          solution_blocks: initSolutionBlocks(s.solution_blocks, s.solution_md),
        }))
      );
    }
  }, [structure, nature]);

  const fieldClass =
    "w-full rounded-xl bg-[#090D16] border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition";

  return (
    <div className="bg-[#111827] border border-indigo-500/35 rounded-2xl p-6 mt-6 space-y-6 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-sm">
            Q{qNo}
          </span>
          <h3 className="text-base font-bold text-white">
            {isEdit ? `Edit Question Q${qNo}` : `Add New Question (Q${qNo})`}
          </h3>
          {(() => {
            const directAdmins = extractAdminUserids(data);
            const existingAdmins = directAdmins.length > 0 ? directAdmins : extractAdminUserids(paper);
            if (existingAdmins.length === 0) return null;
            return (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 ml-2">
                <span className="text-slate-500">by:</span>
                {existingAdmins.map((id: string, i: number) => (
                  <span
                    key={`${id}-${i}`}
                    className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-mono text-[11px]"
                  >
                    {id}
                  </span>
                ))}
              </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-2">
          {paper.paper_pdf && (
            <button
              type="button"
              onClick={() => {
                setShowPdfInEditor(!showPdfInEditor);
                if (!showPdfInEditor) setShowLivePreview(false);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                showPdfInEditor
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
              }`}
              title="Toggle question paper PDF preview side-by-side"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showPdfInEditor ? "Hide PDF" : "PDF Split View"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowLivePreview(!showLivePreview);
              if (!showLivePreview) setShowPdfInEditor(false);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              showLivePreview
                ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title="Toggle live rendered preview of question and solution (KaTeX math & markdown)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? "Close Preview" : "👁️ Live Preview"}</span>
          </button>

          <button
            type="button"
            disabled={aiSolvingInEditor}
            onClick={() => setShowPromptPopup(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{aiSolvingInEditor ? "Generating..." : "✨ AI Generate Solution"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* SPLIT SCREEN CONTAINER */}
      <div className={(showPdfInEditor && paper.paper_pdf) || showLivePreview ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" : ""}>
        {showPdfInEditor && paper.paper_pdf && (
          <div className="h-[82vh] sticky top-20 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
            <div className="h-9 px-3 border-b border-slate-800 bg-[#0d1322] flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="font-semibold text-slate-200">Question Paper PDF</span>
              <a
                href={paper.paper_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Open in tab</span>
                <Eye className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src={`${paper.paper_pdf}#toolbar=1`}
              title="Question Paper PDF"
              className="w-full flex-1 border-0 bg-slate-900"
            />
          </div>
        )}

        {showLivePreview && !showPdfInEditor && (
          <div className="h-[84vh] sticky top-20 rounded-2xl overflow-hidden border border-purple-500/35 bg-[#0B101D] shadow-2xl flex flex-col order-last lg:order-none">
            <div className="h-10 px-4 border-b border-slate-800 bg-[#0d1322] flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                Live Student View Preview
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono">
                Real-time KaTeX Math
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#080C14]">
              {/* Question metadata badge */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs font-mono">
                  Q{qNo}
                </span>
                {marks && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                    {marks} Marks
                  </span>
                )}
                {heading && (
                  <span className="text-xs text-slate-400 font-medium">
                    Section: <span className="text-slate-200">{heading}</span>
                  </span>
                )}
              </div>

              {/* Single question statement */}
              {structure === "single" && question && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Question Statement:
                  </div>
                  <MarkdownContent content={question} />
                </div>
              )}

              {/* Single question solution */}
              {structure === "single" && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    ✓ Rendered Solution
                  </div>
                  {solutionBlocks && solutionBlocks.length > 0 ? (
                    solutionBlocks.map((block: any, bIdx: number) => (
                      <div key={block.id || bIdx} className="space-y-2">
                        {block.type === "text" && block.content && (
                          <MarkdownContent content={block.content} />
                        )}
                        {block.type === "image" && block.image_url && (
                          <div className="space-y-1 pt-1">
                            <img
                              src={block.image_url}
                              alt={block.caption || "diagram"}
                              className="rounded-xl border border-slate-700/80 max-h-[400px] w-auto mx-auto bg-black/40"
                            />
                            {block.caption && (
                              <p className="text-[11px] text-slate-400 italic text-center">
                                {block.caption}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No solution content entered yet.</p>
                  )}
                </div>
              )}

              {/* Multi sub-questions */}
              {structure === "multi" && (
                <div className="space-y-4">
                  {subs.map((sq: any, sIdx: number) => (
                    <div key={sq.sq_no || sIdx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                        <span className="font-bold text-indigo-300 font-mono">
                          Sub-question ({sq.sq_no})
                        </span>
                        {sq.marks && (
                          <span className="text-amber-400 text-[11px]">[{sq.marks} Marks]</span>
                        )}
                      </div>

                      {sq.question_md ? (
                        <MarkdownContent content={sq.question_md} />
                      ) : (
                        <p className="text-xs text-slate-500 italic">No question statement entered</p>
                      )}

                      {/* Sub-question options preview */}
                      {Array.isArray(sq.options) && sq.options.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {sq.options.map((op: string, i: number) => {
                              const isCorrect = typeof sq.correct_index === "number" && sq.correct_index === i;
                              return (
                                <li
                                  key={i}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                    isCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium"
                                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <strong className="mr-1 text-slate-400 shrink-0">
                                      {String.fromCharCode(65 + i)}.
                                    </strong>
                                    <div className="flex-1 min-w-0">
                                      <OptionMathText text={op} />
                                    </div>
                                  </div>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* Solution blocks for this sub */}
                      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          ✓ Sub ({sq.sq_no}) Solution:
                        </div>
                        {sq.solution_blocks && sq.solution_blocks.length > 0 ? (
                          sq.solution_blocks.map((b: any, bIdx: number) => (
                            <div key={b.id || bIdx} className="space-y-1">
                              {b.type === "text" && b.content && (
                                <MarkdownContent content={b.content} />
                              )}
                              {b.type === "image" && b.image_url && (
                                <div className="space-y-1 pt-1">
                                  <img
                                    src={b.image_url}
                                    alt={b.caption || "diagram"}
                                    className="rounded-xl border border-slate-700/80 max-h-[350px] w-auto mx-auto bg-black/40"
                                  />
                                  {b.caption && (
                                    <p className="text-[11px] text-slate-400 italic text-center">
                                      {b.caption}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic">No solution blocks yet</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">


          {/* TOP METADATA GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Marks
          </label>
          <input
            className={fieldClass}
            placeholder="e.g. 14"
            value={marks}
            onChange={e => setMarks(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Question Structure
          </label>
          <select
            className={fieldClass}
            value={structure}
            onChange={e => setStructure(e.target.value)}
          >
            <option value="">Select Structure</option>
            <option value="single">Single Question</option>
            <option value="multi">With Sub-questions (a, b, c...)</option>
          </select>
        </div>

        {structure === "multi" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question Nature
            </label>
            <select
              className={fieldClass}
              value={nature}
              onChange={e => setNature(e.target.value)}
            >
              <option value="">Select Nature</option>
              <option value="objective">Objective (MCQ)</option>
              <option value="subjective">Subjective</option>
            </select>
          </div>
        )}
      </div>

      {/* SINGLE QUESTION EDITOR */}
      {structure === "single" && (
        <div
          onPaste={e => handlePasteClipboardEvent(e, addImageBlock)}
          onDragOver={e => {
            e.preventDefault();
            setDragTarget("single");
          }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragTarget(null);
            }
          }}
          onDrop={e => handleDropFiles(e, addImageBlock)}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question
            </label>
            <textarea
              className={`${fieldClass} h-32`}
              placeholder="Enter question text..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>

          {/* SOLUTION BLOCKS */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Solution Blocks
            </label>

            {solutionBlocks.map((block, index) => (
              <div
                key={block.id}
                className="border border-slate-800 rounded-xl p-4 bg-[#0B101D] space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold uppercase tracking-wide">
                    Block {index + 1} • {block.type}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer transition"
                  >
                    Remove
                  </button>
                </div>

                {/* TEXT BLOCK */}
                {block.type === "text" && (
                  <textarea
                    className={`${fieldClass} h-40`}
                    placeholder="Write Solution... (Tip: You can also press Ctrl+V here to paste a copied image)"
                    value={block.content}
                    onChange={e =>
                      updateBlock(block.id, {
                        content: e.target.value,
                      })
                    }
                  />
                )}

                {/* IMAGE BLOCK */}
                {block.type === "image" && (
                  <div className="space-y-3">
                    <img
                      src={block.image_url}
                      alt="solution"
                      className="rounded-xl border border-slate-700/80 max-h-[400px] object-contain bg-black/30"
                    />

                    <input
                      className={fieldClass}
                      placeholder="Image caption (optional)"
                      value={block.caption || ""}
                      onChange={e =>
                        updateBlock(block.id, {
                          caption: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ADD BLOCK ACTIONS + DRAG & DROP / PASTE ZONE */}
          <div
            tabIndex={0}
            className={`rounded-xl border-2 border-dashed p-4 transition outline-none ${
              dragTarget === "single"
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-slate-700/80 bg-[#0B101D]/80 hover:border-indigo-500/40 focus:border-emerald-500/60"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={addTextBlock}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition"
                >
                  + Add Text Solution
                </button>

                <label className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition">
                  📁 Browse Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await addImageBlock(file);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handlePasteButtonClick(addImageBlock)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold cursor-pointer transition"
                >
                  📋 Paste Copied Image
                </button>
              </div>

              <span className="text-xs text-slate-400">
                Drag & drop image here, or press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                  Ctrl+V
                </kbd>{" "}
                to paste
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MULTI SUB-QUESTIONS EDITOR */}
      {structure === "multi" && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Main Question Heading / Instruction
            </label>
            <input
              className={fieldClass}
              placeholder="e.g. Choose the correct answer of the following (Any seven):"
              value={heading}
              onChange={e => setHeading(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {subs.map((s, i) => (
              <div
                key={s.sq_no}
                onPaste={
                  nature === "subjective"
                    ? e =>
                        handlePasteClipboardEvent(e, file =>
                          addSubImageBlock(i, s.sq_no, file)
                        )
                    : undefined
                }
                onDragOver={
                  nature === "subjective"
                    ? e => {
                        e.preventDefault();
                        setDragTarget(`sub-${i}`);
                      }
                    : undefined
                }
                onDragLeave={
                  nature === "subjective"
                    ? e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragTarget(null);
                        }
                      }
                    : undefined
                }
                onDrop={
                  nature === "subjective"
                    ? e =>
                        handleDropFiles(e, file =>
                          addSubImageBlock(i, s.sq_no, file)
                        )
                    : undefined
                }
                className="border border-slate-800 bg-[#0B101D] p-5 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs">
                    Sub-Question ({s.sq_no})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSub(i)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer transition"
                  >
                    Remove ({s.sq_no})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Marks
                    </label>
                    <input
                      className={fieldClass}
                      placeholder="e.g. 2 or 7"
                      value={s.marks}
                      onChange={e => updateSub(i, { marks: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Sub-Question
                    </label>
                    <textarea
                      className={`${fieldClass} h-24`}
                      placeholder="Enter sub-question text..."
                      value={s.question_md}
                      onChange={e =>
                        updateSub(i, { question_md: e.target.value })
                      }
                    />
                  </div>
                </div>

                {nature === "objective" && (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Options (Select the radio button for the correct answer)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {s.options.map((op: string, idx: number) => (
                          <div
                            key={idx}
                            className={`flex flex-col gap-1.5 p-2 rounded-xl border transition ${
                              s.correct_index === idx
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-slate-800 bg-[#090D16]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={`sub-opt-${i}`}
                                className="accent-emerald-500 w-4 h-4 ml-1 cursor-pointer shrink-0"
                                checked={s.correct_index === idx}
                                onChange={() =>
                                  updateSub(i, { correct_index: idx })
                                }
                              />
                              <span className="text-xs font-bold text-slate-400 shrink-0">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <input
                                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                                placeholder={`Option ${String.fromCharCode(65 + idx)} (Markdown + LaTeX)`}
                                value={op}
                                onChange={e => {
                                  const opts = [...s.options];
                                  opts[idx] = e.target.value;
                                  updateSub(i, { options: opts });
                                }}
                              />
                            </div>
                            {op && (op.includes("$") || op.includes("\\")) && (
                              <div className="ml-7 px-2.5 py-1 rounded bg-slate-950/80 border border-indigo-500/30 text-xs text-indigo-200 flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 shrink-0">Preview:</span>
                                <OptionMathText text={op} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        Explanation / Solution (Optional)
                      </label>
                      <textarea
                        className={`${fieldClass} h-28`}
                        placeholder="Solution explanation (optional)"
                        value={s.solution_md}
                        onChange={e =>
                          updateSub(i, { solution_md: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* SUBJECTIVE SUB-QUESTION SOLUTION BLOCKS */}
                {nature === "subjective" && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Solution Blocks for ({s.sq_no})
                    </label>

                    <div className="space-y-3">
                      {(s.solution_blocks || []).map(
                        (block: any, blockIndex: number) => (
                          <div
                            key={block.id}
                            className="border border-slate-800 rounded-xl p-4 bg-[#111827] space-y-3"
                          >
                            <div className="flex justify-between items-center">
                              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 font-semibold uppercase tracking-wide">
                                Block {blockIndex + 1} • {block.type}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeSubBlock(i, block.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium cursor-pointer transition"
                              >
                                Remove
                              </button>
                            </div>

                            {block.type === "text" && (
                              <textarea
                                className={`${fieldClass} h-36`}
                                placeholder="Write Solution... (Tip: You can also press Ctrl+V here to paste a copied image)"
                                value={block.content}
                                onChange={e =>
                                  updateSubBlock(i, block.id, {
                                    content: e.target.value,
                                  })
                                }
                              />
                            )}

                            {block.type === "image" && (
                              <div className="space-y-3">
                                <img
                                  src={block.image_url}
                                  alt="solution"
                                  className="rounded-xl border border-slate-700/80 max-h-[400px] bg-black/30"
                                />

                                <input
                                  className={fieldClass}
                                  placeholder="Caption (Optional)"
                                  value={block.caption || ""}
                                  onChange={e =>
                                    updateSubBlock(i, block.id, {
                                      caption: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {/* ADD BLOCK ACTIONS + DRAG & DROP / PASTE ZONE */}
                    <div
                      tabIndex={0}
                      className={`rounded-xl border-2 border-dashed p-4 transition outline-none ${
                        dragTarget === `sub-${i}`
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-slate-700/80 bg-[#111827]/70 hover:border-indigo-500/40 focus:border-emerald-500/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => addSubTextBlock(i)}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition"
                          >
                            + Add Text Solution
                          </button>

                          <label className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition">
                            📁 Browse Image
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await addSubImageBlock(i, s.sq_no, file);
                                e.target.value = "";
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              handlePasteButtonClick(file =>
                                addSubImageBlock(i, s.sq_no, file)
                              )
                            }
                            className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold cursor-pointer transition"
                          >
                            📋 Paste Copied Image
                          </button>
                        </div>

                        <span className="text-xs text-slate-400">
                          Drag & drop image here, or press{" "}
                          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                            Ctrl+V
                          </kbd>{" "}
                          to paste
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addSub(nature)}
            disabled={!nature}
            className="px-4 py-2 rounded-xl border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
          >
            + Add Sub-question ({String.fromCharCode(97 + subs.length)})
          </button>
        </div>
      )}

        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={save}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            💾 Save Question
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-sm font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

      {/* AI GUIDANCE & SOLVER POP-UP MODAL */}
      {showPromptPopup && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Solution Generator</h3>
                  <p className="text-xs text-slate-400 font-mono">Question {qNo} ({marks || "7"} Marks)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptPopup(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-question selector if multi */}
            {structure === "multi" && subs.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Sub-questions:
                </label>
                <select
                  value={targetSqInEditor}
                  onChange={(e) => setTargetSqInEditor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">Solve All Sub-questions ({subs.length})</option>
                  {subs.map((sq: any) => (
                    <option key={sq.sq_no} value={sq.sq_no}>
                      Solve Only Sub ({sq.sq_no})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Visual Format Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Visual Format (Diagram / Graph):
              </label>
              <select
                value={visualTypeInEditor}
                onChange={(e) => setVisualTypeInEditor(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-emerald-500 font-medium"
              >
                <option value="svg">⚡ SVG Vector (Default / When Needed)</option>
                <option value="image">🖼️ Actual Image (PNG Matplotlib Plot)</option>
                <option value="none">🚫 No Visuals (Text/Math Only)</option>
              </select>
            </div>

            {/* Prompt input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Optional Guidance for AI (Prompt):
              </label>
              <textarea
                rows={3}
                value={adminPromptInEditor}
                onChange={(e) => setAdminPromptInEditor(e.target.value)}
                placeholder="e.g. Focus on step-by-step derivation, draw diagram only if essential, keep concise..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none resize-none font-sans"
              />
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAdminPromptInEditor("Provide step-by-step mathematical derivation.")}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  + Derivation
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPromptInEditor("Keep explanation concise and high-scoring for exams.")}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  + Concise Notes
                </button>
                <button
                  type="button"
                  onClick={() => setAdminPromptInEditor("Draw technical diagram or circuit only if strictly required.")}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  + Diagram if needed
                </button>
                {adminPromptInEditor && (
                  <button
                    type="button"
                    onClick={() => setAdminPromptInEditor("")}
                    className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPromptPopup(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiSolvingInEditor}
                onClick={() => handleAiGenerateInEditor()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {aiSolvingInEditor ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Solution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
