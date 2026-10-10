"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";

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
                {q.admin_userids?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
                    <span>by</span>
                    {q.admin_userids.map((id: string) => (
                      <span
                        key={id}
                        className="inline-block px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-medium"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                )}

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
                <p className="text-slate-100 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {q.question_md}
                </p>

                {/* SOLUTION BLOCKS OR LEGACY SOLUTION */}
                {hasSingleBlocks ? (
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/25 border-l-4 border-l-emerald-500 p-4 space-y-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      ✓ Solution
                    </div>

                    {q.solution_blocks.map((block: any, bIdx: number) => (
                      <div key={block.id || bIdx}>
                        {block.type === "text" && block.content && (
                          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                            {block.content}
                          </p>
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
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {q.solution_md}
                    </p>
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
                        <p className="text-slate-100 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
                          <span className="inline-block font-bold text-indigo-300 mr-2">
                            ({sq.sq_no})
                          </span>
                          {sq.question_md}
                        </p>
                        {sq.marks && (
                          <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                            {sq.marks} Marks
                          </span>
                        )}
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
                                  <span>
                                    <strong className="mr-1.5">
                                      {String.fromCharCode(65 + i)}.
                                    </strong>
                                    {op}
                                  </span>
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
                                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                      {block.content}
                                    </p>
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
                            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {sq.solution_md}
                            </p>
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


  useEffect(() => {
    if (structure === "single") setNature("subjective");
  }, [structure]);

  function canSave() {
    if (!marks || !structure) return false;
    if (structure === "single") return !!question;
    if (!heading || !nature || subs.length === 0) return false;
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

    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    onSaved();
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
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
        >
          ✕ Close
        </button>
      </div>

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
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                              s.correct_index === idx
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-slate-800 bg-[#090D16]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`sub-opt-${i}`}
                              className="accent-emerald-500 w-4 h-4 ml-1 cursor-pointer"
                              checked={s.correct_index === idx}
                              onChange={() =>
                                updateSub(i, { correct_index: idx })
                              }
                            />
                            <span className="text-xs font-bold text-slate-400">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <input
                              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              value={op}
                              onChange={e => {
                                const opts = [...s.options];
                                opts[idx] = e.target.value;
                                updateSub(i, { options: opts });
                              }}
                            />
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
  );
}
