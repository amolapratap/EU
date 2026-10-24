"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import OptionMathText from "@/components/pyq/OptionMathText";
import { sanitizeLatexMath } from "@/lib/latexSanitizer";
import {
  Sparkles,
  CheckCircle2,
  X,
  RotateCcw,
  Layers,
  ArrowRight,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface AiCompareSolutionModalProps {
  paper: any;
  paperId: string;
  question: any;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AiCompareSolutionModal({
  paper,
  paperId,
  question,
  isOpen,
  onClose,
  onSaved,
}: AiCompareSolutionModalProps) {
  const [adminPrompt, setAdminPrompt] = useState("");
  const [targetSq, setTargetSq] = useState<string>("all");
  const [visualType, setVisualType] = useState<"image" | "svg" | "none">("svg");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  // RESET state when modal opens or question changes to avoid showing previous question's solution
  React.useEffect(() => {
    if (isOpen) {
      setGeneratedResult(null);
      setAdminPrompt("");
      setTargetSq("all");
      setVisualType("svg");
    }
  }, [isOpen, question?.q_no]);

  if (!isOpen || !question) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const isMulti = question.structure === "multi";
  const subQuestions = question.sub_questions || [];

  /* ---------------- GENERATE AI SOLUTION (PREVIEW ONLY) ---------------- */
  async function handleGeneratePreview() {
    setGeneratedResult(null); // Clear previous preview immediately
    setGenerating(true);
    toast.loading(`Generating AI solution for Q${question.q_no}...`, {
      id: `compare-solve-${question.q_no}`,
    });

    try {
      const payload: any = {
        nature: question.nature,
        structure: question.structure,
        heading: question.heading || "",
        question_md: question.question_md || "",
        q_no: question.q_no,
        marks: question.marks,
        options: question.options || [],
        sub_questions: question.sub_questions || [],
        save_to_db: false, // PREVIEW ONLY
        admin_prompt: adminPrompt.trim() || undefined,
        visual_type: visualType,
      };

      if (isMulti && targetSq !== "all") {
        payload.sq_no = targetSq;
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
        throw new Error(json.detail || "Failed to generate solution");
      }

      setGeneratedResult(json);
      toast.success(`New solution generated! Compare with current solution below.`, {
        id: `compare-solve-${question.q_no}`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI solution", {
        id: `compare-solve-${question.q_no}`,
      });
    } finally {
      setGenerating(false);
    }
  }

  /* ---------------- COMMIT & OVERRIDE IN DATABASE ---------------- */
  async function handleOverrideAndSave() {
    if (!generatedResult) {
      toast.error("Please generate a new solution first.");
      return;
    }

    setSaving(true);
    toast.loading(`Overriding and saving Q${question.q_no} solution to database...`, {
      id: `override-${question.q_no}`,
    });

    try {
      // Build the updated question to save
      let updatedSubs = question.sub_questions || [];
      let updatedBlocks = question.solution_blocks || [];
      let updatedCorrectIndex = question.correct_index;
      let updatedSolMd = question.solution_md;

      if (isMulti && generatedResult.sub_questions) {
        if (targetSq !== "all") {
          updatedSubs = (question.sub_questions || []).map((origSq: any) => {
            if (String(origSq.sq_no).trim().toLowerCase() === String(targetSq).trim().toLowerCase()) {
              const newlyGen = generatedResult.sub_questions.find(
                (n: any) => String(n.sq_no).trim().toLowerCase() === String(targetSq).trim().toLowerCase()
              );
              return newlyGen || origSq;
            }
            return origSq;
          });
        } else {
          updatedSubs = generatedResult.sub_questions;
        }
      } else if (question.nature === "objective" && generatedResult.objective_solution) {
        updatedCorrectIndex = generatedResult.objective_solution.correct_index;
        updatedSolMd = generatedResult.objective_solution.explanation;
      } else if (generatedResult.solution_blocks) {
        updatedBlocks = generatedResult.solution_blocks;
      }

      const payload: any = {
        nature: question.nature,
        structure: question.structure,
        heading: question.heading || "",
        question_md: question.question_md || "",
        q_no: question.q_no,
        marks: question.marks,
        options: question.options || [],
        sub_questions: updatedSubs,
        save_to_db: true,
        direct_save: true,
        solution_blocks: updatedBlocks,
        correct_index: updatedCorrectIndex,
        solution_md: updatedSolMd,
      };

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
        throw new Error(json.detail || "Failed to save solution to database");
      }

      toast.success(`Q${question.q_no} new solution successfully approved and saved!`, {
        id: `override-${question.q_no}`,
      });

      await onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to override solution", {
        id: `override-${question.q_no}`,
      });
    } finally {
      setSaving(false);
    }
  }

  /* Helper to render solution blocks nicely with KaTeX */
  const renderSolutionBlocks = (blocks: any[] | undefined) => {
    if (!blocks || blocks.length === 0) {
      return (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
          No solution blocks generated
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {blocks.map((block: any, idx: number) => (
          <div key={block.id || idx} className="space-y-2">
            {block.type === "text" && block.content && (
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {sanitizeLatexMath(block.content)}
                </ReactMarkdown>
              </div>
            )}
            {block.type === "image" && block.image_url && (
              <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Technical SVG Diagram
                  </span>
                  <a
                    href={block.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View full image
                  </a>
                </div>
                <img
                  src={block.image_url}
                  alt={block.caption || "SVG Diagram"}
                  className="max-h-56 mx-auto rounded-lg border border-slate-800 bg-white/5 object-contain"
                />
                {block.caption && (
                  <p className="text-xs text-slate-400 text-center italic">{block.caption}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMathText = (content: string, className = "") => {
    if (!content) return null;
    return (
      <div className={`prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed font-sans ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
          }}
        >
          {sanitizeLatexMath(content)}
        </ReactMarkdown>
      </div>
    );
  };

  const renderOptionsList = (options: string[], correctIndex?: number | null) => {
    if (!Array.isArray(options) || options.length === 0) return null;
    return (
      <div className="space-y-1.5 pt-1">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((op: string, idx: number) => {
            const isCorrect = typeof correctIndex === "number" && correctIndex === idx;
            return (
              <li
                key={idx}
                className={`px-3 py-2 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                  isCorrect
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-medium"
                    : "bg-slate-900/60 border-slate-800 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <strong className="mr-1 text-slate-400 shrink-0">
                    {String.fromCharCode(65 + idx)}.
                  </strong>
                  <div className="flex-1 min-w-0">
                    <OptionMathText text={op} />
                  </div>
                </div>
                {isCorrect && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    ✓ Correct
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[94vh] flex flex-col bg-[#090D16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden [color-scheme:dark]">
        
        {/* MODAL HEADER */}
        <header className="px-5 py-4 border-b border-slate-800 bg-[#0D1322] flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Solution Generator & Comparison
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                  Q{question.q_no}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                  {question.marks} Marks
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs capitalize">
                  {question.structure} • {question.nature}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate and compare the new AI solution with the currently saved solution before overriding.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* PROMPT & CONTROLS POP-UP BAR */}
        <div className="p-4 border-b border-slate-800 bg-[#0B101D] space-y-3 shrink-0">
          {/* Question text snippet */}
          {question.heading && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/25 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                Main Question Context / Shared Diagram (All Sub-questions):
              </span>
              <div className="text-xs text-slate-200">
                {renderMathText(question.heading)}
              </div>
            </div>
          )}
          {question.question_md && (
            <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              {renderMathText(question.question_md)}
            </div>
          )}

          {/* Optional Prompt Input + Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <input
                type="text"
                placeholder="Optional AI Guidance Prompt (e.g. Focus on derivations, compare Star vs Mesh, keep concise...)"
                value={adminPrompt}
                onChange={(e) => setAdminPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-sans"
              />
            </div>

            {/* If multi question: Target selection */}
            {isMulti && subQuestions.length > 0 && (
              <select
                value={targetSq}
                onChange={(e) => setTargetSq(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="all">Solve All Sub-questions ({subQuestions.length})</option>
                {subQuestions.map((sq: any) => (
                  <option key={sq.sq_no} value={sq.sq_no}>
                    Solve Only Sub ({sq.sq_no})
                  </option>
                ))}
              </select>
            )}

            {/* Visual Type Selector (SVG / Image / None) */}
            <select
              value={visualType}
              onChange={(e) => setVisualType(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 outline-none focus:border-indigo-500 shrink-0 font-medium"
              title="Select visual format for diagrams/graphs"
            >
              <option value="svg">⚡ SVG Vector (Default / When Needed)</option>
              <option value="image">🖼️ Actual Image (PNG Plot)</option>
              <option value="none">🚫 No Visuals</option>
            </select>

            <button
              type="button"
              disabled={generating}
              onClick={handleGeneratePreview}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {generating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Generating Solution...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{generatedResult ? "Regenerate Preview" : "Generate AI Solution"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* COMPARISON BODY (SEPARATE INDEPENDENT SCROLLING COLUMNS) */}
        <div className="flex-1 min-h-0 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 overflow-hidden">
          
          {/* COLUMN 1: CURRENT SOLUTION IN DATABASE (INDEPENDENT SCROLL) */}
          <div className="h-full flex flex-col min-h-0 rounded-2xl border border-slate-800 bg-[#0B101D] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Current Saved Solution (Database)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Existing in Paper</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* SINGLE QUESTION CURRENT */}
              {!isMulti && (
                <div className="space-y-3">
                  {renderOptionsList(question.options, question.correct_index)}
                  {question.solution_blocks && question.solution_blocks.length > 0 ? (
                    renderSolutionBlocks(question.solution_blocks)
                  ) : question.solution_md ? (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                      {renderMathText(question.solution_md)}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      No solution is currently saved for this question in the database.
                    </div>
                  )}
                </div>
              )}

              {/* MULTI QUESTION CURRENT */}
              {isMulti && (
                <div className="space-y-4">
                  {subQuestions.map((sq: any) => (
                    <div
                      key={sq.sq_no}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300 font-mono">
                          Sub-Question ({sq.sq_no})
                        </span>
                        {sq.marks && <span className="text-amber-400 font-mono text-[11px]">{sq.marks} Marks</span>}
                      </div>
                      <div className="text-xs text-slate-300">
                        {renderMathText(sq.question_md)}
                      </div>

                      {renderOptionsList(sq.options, sq.correct_index)}

                      {sq.solution_blocks && sq.solution_blocks.length > 0 ? (
                        renderSolutionBlocks(sq.solution_blocks)
                      ) : sq.solution_md ? (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                          {renderMathText(sq.solution_md)}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic p-2 rounded bg-slate-900/50">
                          No solution saved for ({sq.sq_no})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: NEW AI GENERATED SOLUTION (PREVIEW - INDEPENDENT SCROLL) */}
          <div className="h-full flex flex-col min-h-0 rounded-2xl border border-emerald-500/35 bg-[#0B101D] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#0c1a24] border-b border-emerald-500/30 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                New AI Solution (Preview)
              </span>
              {generatedResult ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-semibold">
                  Ready to Override
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">Pending Generation</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* NOT GENERATED YET */}
              {!generatedResult && (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-800 text-center space-y-3 bg-slate-950/40">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">No New Solution Generated Yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Enter an optional guidance prompt above and click <strong>&quot;Generate AI Solution&quot;</strong> to generate and preview the new solution here.
                    </p>
                  </div>
                </div>
              )}

              {/* SINGLE QUESTION NEW */}
              {generatedResult && !isMulti && (
                <div className="space-y-3 p-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  {generatedResult.solution_blocks && generatedResult.solution_blocks.length > 0 ? (
                    renderSolutionBlocks(generatedResult.solution_blocks)
                  ) : generatedResult.objective_solution ? (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-3">
                      {(generatedResult.verification_status === "dual_check_verified" || generatedResult.objective_solution.verification_status === "dual_check_verified") && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Dual-Check Verified: 2 independent runs agree 100%</span>
                        </div>
                      )}
                      {(generatedResult.verification_status === "majority_2_of_3" || generatedResult.objective_solution.verification_status === "majority_2_of_3") && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>Tie-Breaker Majority Consensus (2 of 3 runs agreed)</span>
                        </div>
                      )}
                      {(generatedResult.verification_status === "split_decision" || generatedResult.objective_solution.verification_status === "split_decision") && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Discrepancy: Independent solvers disagreed. Please review carefully.</span>
                        </div>
                      )}
                      {renderOptionsList(question.options, generatedResult.objective_solution.correct_index)}
                      <div className="text-xs font-bold text-emerald-400">
                        Correct Option: Option {String.fromCharCode(65 + (generatedResult.objective_solution.correct_index ?? 0))}
                      </div>
                      <div className="text-xs text-slate-200">
                        {renderMathText(generatedResult.objective_solution.explanation)}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* MULTI QUESTION NEW */}
              {generatedResult && isMulti && generatedResult.sub_questions && (
                <div className="space-y-4">
                  {generatedResult.sub_questions.map((nsq: any) => {
                    const isTargeted = targetSq === "all" || String(targetSq).trim().toLowerCase() === String(nsq.sq_no).trim().toLowerCase();
                    const isNewlyGenerated = nsq.is_newly_generated !== false && isTargeted;

                    return (
                      <div
                        key={nsq.sq_no}
                        className={`p-3.5 rounded-xl border space-y-2.5 shadow-sm ${
                          isNewlyGenerated
                            ? "bg-slate-950/80 border-emerald-500/40"
                            : "bg-slate-950/40 border-slate-800 opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold font-mono ${isNewlyGenerated ? "text-emerald-400" : "text-slate-400"}`}>
                            {isNewlyGenerated ? `New AI Solution for (${nsq.sq_no})` : `Current / Unchanged for (${nsq.sq_no})`}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              isNewlyGenerated
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {isNewlyGenerated ? "Generated" : "Not targeted"}
                          </span>
                        </div>

                        {nsq.verification_status === "dual_check_verified" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Dual-Check Verified (100% agreement)</span>
                          </div>
                        )}
                        {nsq.verification_status === "majority_2_of_3" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>Tie-Breaker Majority Consensus (2-of-3)</span>
                          </div>
                        )}
                        {nsq.verification_status === "split_decision" && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Discrepancy: Solvers split</span>
                          </div>
                        )}

                        {renderOptionsList(nsq.options, nsq.correct_index)}

                        {nsq.error ? (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                            {nsq.error}
                          </div>
                        ) : nsq.solution_blocks && nsq.solution_blocks.length > 0 ? (
                          renderSolutionBlocks(nsq.solution_blocks)
                        ) : nsq.solution_md ? (
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                            {renderMathText(nsq.solution_md)}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic p-2 rounded bg-slate-900/50">
                            No solution generated for ({nsq.sq_no})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MODAL BOTTOM ACTION BAR */}
        <footer className="px-5 py-3.5 border-t border-slate-800 bg-[#0D1322] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel / Keep Existing
          </button>

          <div className="flex items-center gap-3">
            {generatedResult && (
              <button
                type="button"
                disabled={generating}
                onClick={handleGeneratePreview}
                className="px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}

            <button
              type="button"
              disabled={!generatedResult || saving || generating}
              onClick={handleOverrideAndSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {saving ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Overriding...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Override & Save to Paper</span>
                </>
              )}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
