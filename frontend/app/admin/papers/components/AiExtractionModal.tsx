"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  X,
  Layers,
  Eye,
  Trash2,
  Check,
  RotateCcw,
  Plus,
  Maximize2,
  Minimize2,
  Columns,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface AiExtractionModalProps {
  paper: any;
  paperId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AiExtractionModal({
  paper,
  paperId,
  isOpen,
  onClose,
  onSaved,
}: AiExtractionModalProps) {
  const [sourceType, setSourceType] = useState<"existing" | "upload">(
    paper?.paper_pdf ? "existing" : "upload"
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pageRangeInput, setPageRangeInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState<any[] | null>(null);
  const [solvingQ, setSolvingQ] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<"both" | "pdf" | "editor">("both");
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [adminPrompt, setAdminPrompt] = useState<string>("");
  const [visualType, setVisualType] = useState<"image" | "svg" | "none">("svg");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep sourceType synced to 'existing' whenever paper_pdf exists
  useEffect(() => {
    if (paper?.paper_pdf) {
      setSourceType("existing");
    } else {
      setSourceType("upload");
    }
  }, [paper?.paper_pdf, isOpen]);

  // Handle draggable split-screen resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp split percent between 20% and 80%
      setSplitPercent(Math.min(Math.max(newPercent, 20), 80));
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Compute live PDF preview URL
  const pdfPreviewUrl = useMemo(() => {
    if (sourceType === "upload" && uploadedFile) {
      return URL.createObjectURL(uploadedFile);
    }
    return paper.paper_pdf || "";
  }, [sourceType, uploadedFile, paper.paper_pdf]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  if (!isOpen) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  /* ---------------- START EXTRACTION ---------------- */
  async function handleStartExtraction() {
    setLoading(true);
    setLoadingMsg("Uploading & converting PDF pages at 300 DPI...");

    try {
      const formData = new FormData();

      if (sourceType === "upload") {
        if (!uploadedFile) {
          toast.error("Please choose a PDF file to upload.");
          setLoading(false);
          return;
        }
        formData.append("file", uploadedFile);
      } else {
        if (!paper.paper_pdf) {
          toast.error("No existing PDF found for this paper.");
          setLoading(false);
          return;
        }
        formData.append("pdf_url", paper.paper_pdf);
      }

      if (pageRangeInput.trim()) {
        formData.append("page_numbers", pageRangeInput.trim());
      }

      setLoadingMsg("AI analyzing document layout, formulas, and diagrams with Gemini 3.8 Flash...");

      const res = await fetch(`${API_URL}/admin/papers/${paperId}/ai-extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.detail || json.error || "Failed to extract questions.");
      }

      setExtractedQuestions(json.questions || []);
      toast.success(`Successfully extracted ${json.questions?.length || 0} questions! Review in right pane.`);
    } catch (err: any) {
      toast.error(err.message || "Extraction failed.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  /* ---------------- SOLVE SINGLE QUESTION ---------------- */
  async function handleSolveQuestion(qIndex: number) {
    if (!extractedQuestions) return;
    const q = extractedQuestions[qIndex];
    setSolvingQ(q.q_no);

    toast.loading(`Solving Q${q.q_no} with AI...`, { id: `solve-${q.q_no}` });

    try {
      const payload: any = {
        nature: q.nature,
        structure: q.structure,
        question_md: q.question_md || "",
        q_no: q.q_no,
        marks: q.marks,
        options: q.options || [],
        sub_questions: q.sub_questions || [],
        admin_prompt: adminPrompt.trim() || undefined,
        visual_type: visualType,
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
        throw new Error(json.detail || "Solver failed");
      }

      setExtractedQuestions((prev) => {
        if (!prev) return prev;
        return prev.map((item, idx) => {
          if (idx !== qIndex) return item;
          const newItem = { ...item };
          if (q.structure === "multi" && json.sub_questions) {
            newItem.sub_questions = json.sub_questions;
          } else if (q.nature === "objective" && json.objective_solution) {
            newItem.correct_index = json.objective_solution.correct_index;
            newItem.solution_md = json.objective_solution.explanation;
          } else if (json.solution_blocks) {
            newItem.solution_blocks = json.solution_blocks;
          }
          return newItem;
        });
      });
      toast.success(`Q${q.q_no} solved with AI!`, { id: `solve-${q.q_no}` });
    } catch (err: any) {
      toast.error(err.message || "Failed to solve", { id: `solve-${q.q_no}` });
    } finally {
      setSolvingQ(null);
    }
  }

  /* ---------------- SOLVE ALL QUESTIONS ---------------- */
  async function handleSolveAll() {
    if (!extractedQuestions || extractedQuestions.length === 0) return;
    for (let i = 0; i < extractedQuestions.length; i++) {
      await handleSolveQuestion(i);
    }
    toast.success("All questions solved!");
  }

  /* ---------------- COMMIT / SAVE TO DB ---------------- */
  async function handleSaveToDatabase() {
    if (!extractedQuestions || extractedQuestions.length === 0) {
      toast.error("No questions to save.");
      return;
    }

    setLoading(true);
    setLoadingMsg("Saving verified questions to database...");

    try {
      const res = await fetch(`${API_URL}/admin/papers/${paperId}/ai-save-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ questions: extractedQuestions }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.detail || "Failed to save questions");
      }

      toast.success("Questions successfully approved and saved to paper!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save to database");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  /* ---------------- MODIFY / EDIT FIELD HELPERS ---------------- */
  function updateQuestion(index: number, patch: any) {
    if (!extractedQuestions) return;
    const updated = [...extractedQuestions];
    updated[index] = { ...updated[index], ...patch };
    setExtractedQuestions(updated);
  }

  function deleteQuestion(index: number) {
    if (!extractedQuestions) return;
    setExtractedQuestions(extractedQuestions.filter((_, i) => i !== index));
  }

  function addNewQuestion() {
    const nextQNo = (extractedQuestions?.length || 0) + 1;
    const newQ = {
      q_no: String(nextQNo),
      marks: 14,
      structure: "single",
      nature: "subjective",
      question_md: "",
      options: ["", "", "", ""],
      correct_index: null,
      sub_questions: [],
    };
    setExtractedQuestions([...(extractedQuestions || []), newQ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#090D16] text-slate-100 [color-scheme:dark] overflow-hidden animate-in fade-in duration-150">
      
      {/* TOP APPLICATION BAR */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-800 bg-[#0e1424] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              <span className="truncate">{paper.name || "Exam Question Paper"}</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                Split Screen Review
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Code: <strong className="text-slate-200">{paper.subject_code || "N/A"}</strong> • Year: <strong className="text-slate-200">{paper.year || "N/A"}</strong>
            </p>
          </div>
        </div>

        {/* CONTROLS & ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pane Switcher (Responsive) */}
          <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setActivePane("pdf")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePane === "pdf" ? "bg-indigo-600 text-white font-medium" : "hover:text-slate-200"
              }`}
            >
              PDF Only
            </button>
            <button
              type="button"
              onClick={() => setActivePane("both")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePane === "both" ? "bg-indigo-600 text-white font-medium" : "hover:text-slate-200"
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActivePane("editor")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePane === "editor" ? "bg-indigo-600 text-white font-medium" : "hover:text-slate-200"
              }`}
            >
              Editor Only
            </button>
          </div>

          {/* Quick source toggle if no questions extracted yet */}
          {!extractedQuestions && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleStartExtraction}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{loading ? "Extracting..." : "Start AI Extraction"}</span>
              </button>
            </div>
          )}

          {extractedQuestions && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSolveAll}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-300 text-xs font-semibold transition items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Auto-Solve All</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveToDatabase}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Save to Paper</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Split View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* SPLIT SCREEN BODY */}
      <div 
        ref={containerRef}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative ${isDragging ? "select-none" : ""}`}
      >
        {/* Transparent overlay while dragging prevents iframe from capturing cursor events */}
        {isDragging && (
          <div className="absolute inset-0 z-50 cursor-col-resize bg-transparent" />
        )}
        
        {/* =========================================================
            LEFT PANE: OFFICIAL PDF PREVIEW
        ========================================================= */}
        {(activePane === "both" || activePane === "pdf") && (
          <div 
            style={activePane === "both" ? { width: `${splitPercent}%` } : { width: "100%" }}
            className="h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#070b13] overflow-hidden"
          >
            
            {/* LEFT PANE TOOLBAR */}
            <div className="h-11 px-4 border-b border-slate-800 bg-[#0d1322] flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-200">Question Paper PDF</span>
              </div>

              <div className="flex items-center gap-3">
                {pdfPreviewUrl && (
                  <a
                    href={pdfPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSourceType("existing")}
                    disabled={!paper.paper_pdf}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      sourceType === "existing"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    } ${!paper.paper_pdf ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    Saved PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType("upload");
                      fileInputRef.current?.click();
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      sourceType === "upload"
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Upload New
                  </button>
                </div>
              </div>
            </div>

            {/* HIDDEN FILE INPUT */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadedFile(e.target.files[0]);
                  setSourceType("upload");
                }
              }}
            />

            {/* PDF VIEWER FRAME */}
            <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center">
              {pdfPreviewUrl ? (
                <iframe
                  src={`${pdfPreviewUrl}#toolbar=1&navpanes=0`}
                  title="PDF Viewer"
                  className="w-full h-full border-0 bg-slate-900"
                />
              ) : (
                <div className="p-8 text-center space-y-4 max-w-sm">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">No PDF Loaded</h3>
                    <p className="text-xs text-slate-400">
                      Upload an official question paper PDF to display it side-by-side with the extraction editor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Choose PDF File
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* DRAGGABLE DIVIDER (RESIZE SPLIT SCREEN) */}
        {activePane === "both" && (
          <div
            onMouseDown={handleMouseDown}
            className={`hidden lg:flex w-2.5 -ml-1 -mr-1 z-30 cursor-col-resize select-none items-center justify-center group transition-colors ${
              isDragging ? "bg-indigo-600 shadow-lg shadow-indigo-600/50" : "hover:bg-indigo-500/50 bg-slate-800"
            }`}
            title="Click and drag horizontally to resize split panes"
          >
            <div className="w-1 h-8 rounded-full bg-slate-500 group-hover:bg-indigo-200 transition-colors" />
          </div>
        )}

        {/* =========================================================
            RIGHT PANE: STAGING REVIEW & QUESTIONS EDITOR
        ========================================================= */}
        {(activePane === "both" || activePane === "editor") && (
          <div 
            style={activePane === "both" ? { width: `${100 - splitPercent}%` } : { width: "100%" }}
            className="h-full flex flex-col bg-[#0b101d] overflow-hidden"
          >
            
            {/* RIGHT PANE TOOLBAR */}
            <div className="h-11 px-4 border-b border-slate-800 bg-[#0e1424] flex items-center justify-between text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  {extractedQuestions ? `Staging Review (${extractedQuestions.length} Questions)` : "Extraction Controls"}
                </span>
                {extractedQuestions && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/25">
                    Ready for Approval
                  </span>
                )}
              </div>

              {extractedQuestions && (
                <button
                  type="button"
                  onClick={addNewQuestion}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Question</span>
                </button>
              )}
            </div>

            {/* RIGHT PANE SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* IF NOT EXTRACTED YET: DISPLAY PRE-FLIGHT CONFIGURATION */}
              {!extractedQuestions && (
                <div className="max-w-md mx-auto py-8 space-y-5">
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 space-y-2">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Side-by-Side Review Mode
                    </div>
                    <p>
                      Click <strong>"Start AI Extraction"</strong>. Gemini 3.8 Flash will process the PDF pages shown on the left, extracting all questions, marks, LaTeX formulas, objective options (A, B, C, D), and precision-cropped diagrams.
                    </p>
                  </div>

                  {/* PAGE RANGE INPUT */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Page Range (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 2, 3 or leave empty for all pages"
                      value={pageRangeInput}
                      onChange={(e) => setPageRangeInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                    <p className="text-[11px] text-slate-500">
                      Leave empty to extract all pages from the PDF.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loading || (!uploadedFile && !paper.paper_pdf)}
                    onClick={handleStartExtraction}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>{loadingMsg || "Analyzing PDF..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Start AI Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* IF EXTRACTED: RENDER FULL QUESTION CARDS FOR SIDE-BY-SIDE REVIEW */}
              {extractedQuestions && (
                <div className="space-y-5">
                  {/* OPTIONAL AI GUIDANCE PROMPT FOR SOLVER */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        AI Solver Instructions / Guidance (Optional)
                      </label>
                      <span className="text-[10px] text-slate-500">Custom prompt applied on AI Solve</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="text"
                        placeholder="e.g. Focus on step-by-step mathematical derivation, keep solution concise, draw circuit diagram..."
                        value={adminPrompt}
                        onChange={(e) => setAdminPrompt(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <select
                        value={visualType}
                        onChange={(e) => setVisualType(e.target.value as any)}
                        className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-200 outline-none focus:border-indigo-500 shrink-0 font-medium"
                        title="Select visual format for diagrams/graphs"
                      >
                        <option value="svg">⚡ SVG Vector (Default / When Needed)</option>
                        <option value="image">🖼️ Actual Image (PNG Plot)</option>
                        <option value="none">🚫 No Visuals</option>
                      </select>
                    </div>
                  </div>
                  {extractedQuestions.map((q, idx) => (
                    <div
                      key={`${q.q_no}-${idx}`}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-4 shadow-sm"
                    >
                      {/* CARD HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 font-bold text-xs font-mono">
                            Q{q.q_no}
                          </span>
                          
                          {/* Marks Input */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] text-slate-500">Marks:</label>
                            <input
                              type="number"
                              value={q.marks}
                              onChange={(e) => updateQuestion(idx, { marks: Number(e.target.value) })}
                              className="w-16 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-amber-300 font-semibold font-mono"
                            />
                          </div>

                          {/* Structure Selector */}
                          <select
                            value={q.structure}
                            onChange={(e) => updateQuestion(idx, { structure: e.target.value })}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 capitalize"
                          >
                            <option value="single">Single</option>
                            <option value="multi">Multi (Sub-questions)</option>
                          </select>

                          {/* Nature Selector */}
                          <select
                            value={q.nature}
                            onChange={(e) => updateQuestion(idx, { nature: e.target.value })}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 capitalize"
                          >
                            <option value="subjective">Subjective</option>
                            <option value="objective">Objective (MCQ)</option>
                          </select>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={solvingQ === q.q_no}
                            onClick={() => handleSolveQuestion(idx)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>{solvingQ === q.q_no ? "Solving..." : "AI Solve"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(idx)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* HEADING (IF MULTI) */}
                      {q.structure === "multi" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase">Section Heading:</label>
                          <input
                            type="text"
                            value={q.heading || ""}
                            placeholder="e.g. Choose the correct answer of the following:"
                            onChange={(e) => updateQuestion(idx, { heading: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#090D16] border border-slate-800 text-xs text-slate-200 outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* QUESTION TEXT (FOR SINGLE STRUCTURE) */}
                      {q.structure === "single" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase">Question Text (Markdown + LaTeX):</label>
                          <textarea
                            rows={3}
                            value={q.question_md || ""}
                            onChange={(e) => updateQuestion(idx, { question_md: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#090D16] border border-slate-800 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* EMBEDDED DIAGRAM PREVIEW */}
                      {q.diagram_url && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              Auto-Cropped Diagram
                            </span>
                            <a
                              href={q.diagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> View full image
                            </a>
                          </div>
                          <img
                            src={q.diagram_url}
                            alt={`Q${q.q_no} Diagram`}
                            className="max-h-48 rounded-lg border border-slate-800 bg-white/5 object-contain"
                          />
                        </div>
                      )}

                      {/* SINGLE OBJECTIVE OPTIONS (IF SINGLE & OBJECTIVE) */}
                      {q.structure === "single" && q.nature === "objective" && (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Multiple Choice Options (Select radio for correct option):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(q.options && q.options.length === 4 ? q.options : ["", "", "", ""]).map((opt: string, optIdx: number) => {
                              const isCorrect = q.correct_index === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                                    isCorrect ? "bg-emerald-500/15 border-emerald-500/40" : "bg-[#090D16] border-slate-800"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`single-opt-${idx}`}
                                    checked={isCorrect}
                                    onChange={() => updateQuestion(idx, { correct_index: optIdx })}
                                    className="accent-emerald-500 w-4 h-4 cursor-pointer ml-1"
                                  />
                                  <span className="text-xs font-bold text-slate-400">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    onChange={(e) => {
                                      const currentOpts = q.options && q.options.length === 4 ? [...q.options] : ["", "", "", ""];
                                      currentOpts[optIdx] = e.target.value;
                                      updateQuestion(idx, { options: currentOpts });
                                    }}
                                    className="w-full bg-transparent text-xs text-slate-100 outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {q.solution_md && (
                            <div className="space-y-1 pt-1">
                              <label className="text-[11px] font-semibold text-emerald-400 uppercase">AI Explanation:</label>
                              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 font-mono">
                                {q.solution_md}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-QUESTIONS (IF MULTI) */}
                      {q.structure === "multi" && (
                        <div className="space-y-3 pl-3 sm:pl-4 border-l-2 border-indigo-500/30 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase">
                              Sub-Questions ({q.sub_questions?.length || 0}):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentSubs = q.sub_questions || [];
                                const nextLetter = String.fromCharCode(97 + currentSubs.length);
                                const newSub = {
                                  sq_no: nextLetter,
                                  marks: q.nature === "objective" ? 2 : 7,
                                  question_md: "",
                                  options: ["", "", "", ""],
                                  correct_index: null,
                                  solution_md: "",
                                };
                                updateQuestion(idx, { sub_questions: [...currentSubs, newSub] });
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add sub-question
                            </button>
                          </div>

                          {(q.sub_questions || []).map((sq: any, sqIdx: number) => (
                            <div
                              key={sqIdx}
                              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-300 font-mono text-xs">
                                  ({sq.sq_no})
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] text-slate-500">Marks:</label>
                                  <input
                                    type="number"
                                    value={sq.marks}
                                    onChange={(e) => {
                                      const newSubs = [...q.sub_questions];
                                      newSubs[sqIdx].marks = Number(e.target.value);
                                      updateQuestion(idx, { sub_questions: newSubs });
                                    }}
                                    className="w-14 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-amber-300 font-mono font-semibold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSubs = q.sub_questions.filter((_: any, sIdx: number) => sIdx !== sqIdx);
                                      updateQuestion(idx, { sub_questions: newSubs });
                                    }}
                                    className="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Sub-Question Text */}
                              <textarea
                                rows={2}
                                value={sq.question_md || ""}
                                placeholder="Sub-question statement..."
                                onChange={(e) => {
                                  const newSubs = [...q.sub_questions];
                                  newSubs[sqIdx].question_md = e.target.value;
                                  updateQuestion(idx, { sub_questions: newSubs });
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 text-xs text-slate-200 font-mono outline-none focus:border-indigo-500"
                              />

                              {/* SUB-QUESTION OBJECTIVE OPTIONS (IF OBJECTIVE) */}
                              {q.nature === "objective" && (
                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                    Options & Answer for ({sq.sq_no}):
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {(sq.options && sq.options.length === 4 ? sq.options : ["", "", "", ""]).map((opt: string, optIdx: number) => {
                                      const isCorrect = sq.correct_index === optIdx;
                                      return (
                                        <div
                                          key={optIdx}
                                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition ${
                                            isCorrect ? "bg-emerald-500/15 border-emerald-500/40" : "bg-[#090D16] border-slate-800"
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`sub-opt-${idx}-${sqIdx}`}
                                            checked={isCorrect}
                                            onChange={() => {
                                              const newSubs = [...q.sub_questions];
                                              newSubs[sqIdx].correct_index = optIdx;
                                              updateQuestion(idx, { sub_questions: newSubs });
                                            }}
                                            className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer ml-0.5"
                                          />
                                          <span className="text-[11px] font-bold text-slate-400">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <input
                                            type="text"
                                            value={opt}
                                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                            onChange={(e) => {
                                              const currentOpts = sq.options && sq.options.length === 4 ? [...sq.options] : ["", "", "", ""];
                                              currentOpts[optIdx] = e.target.value;
                                              const newSubs = [...q.sub_questions];
                                              newSubs[sqIdx].options = currentOpts;
                                              updateQuestion(idx, { sub_questions: newSubs });
                                            }}
                                            className="w-full bg-transparent text-xs text-slate-200 outline-none"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {sq.solution_md && (
                                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
                                      {sq.solution_md}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Sub diagram */}
                              {sq.diagram_url && (
                                <div className="p-2 rounded-lg bg-slate-900 border border-indigo-500/20">
                                  <img
                                    src={sq.diagram_url}
                                    alt={`Sub (${sq.sq_no}) Diagram`}
                                    className="max-h-32 rounded object-contain"
                                  />
                                </div>
                              )}

                              {/* SUB-QUESTION SOLUTION BLOCKS (FOR SUBJECTIVE MULTI-QUESTIONS) */}
                              {sq.solution_blocks && sq.solution_blocks.length > 0 && (
                                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                                  <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">
                                    Generated AI Solution for ({sq.sq_no}) ({sq.solution_blocks.length} block{sq.solution_blocks.length > 1 ? "s" : ""}):
                                  </span>
                                  <div className="space-y-2">
                                    {sq.solution_blocks.map((b: any, bIdx: number) => (
                                      <div key={b.id || bIdx} className="text-xs text-slate-300 font-mono">
                                        {b.type === "text" && (
                                          <div className="p-2 rounded bg-slate-950 border border-slate-800 line-clamp-4 whitespace-pre-wrap">
                                            {b.content}
                                          </div>
                                        )}
                                        {b.type === "image" && (
                                          <div className="p-2 rounded bg-slate-950 border border-indigo-500/30 flex items-center gap-3">
                                            <img src={b.image_url} alt="SVG Diagram" className="h-14 rounded object-contain bg-white/5" />
                                            <span className="text-[11px] text-indigo-300">{b.caption || "SVG Diagram"}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* SUB-QUESTION SOLUTION MARKDOWN (IF PRESENT OUTSIDE OBJECTIVE) */}
                              {sq.solution_md && q.nature !== "objective" && (
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono whitespace-pre-wrap">
                                  {sq.solution_md}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* SOLUTION BLOCKS PREVIEW (IF SOLVED) */}
                      {q.solution_blocks && q.solution_blocks.length > 0 && (
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                          <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">
                            Generated AI Solution ({q.solution_blocks.length} blocks):
                          </span>
                          <div className="space-y-2">
                            {q.solution_blocks.map((b: any, bIdx: number) => (
                              <div key={bIdx} className="text-xs text-slate-300 font-mono">
                                {b.type === "text" && (
                                  <div className="p-2 rounded bg-slate-950 border border-slate-800 line-clamp-3">
                                    {b.content}
                                  </div>
                                )}
                                {b.type === "image" && (
                                  <div className="p-2 rounded bg-slate-950 border border-indigo-500/30 flex items-center gap-3">
                                    <img src={b.image_url} alt="SVG Diagram" className="h-16 rounded object-contain bg-white/5" />
                                    <span className="text-xs text-indigo-300">{b.caption || "SVG Diagram"}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
