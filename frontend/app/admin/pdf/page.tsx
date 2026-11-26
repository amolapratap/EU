"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eraser,
  Eye,
  FileText,
  Layers,
  Link2,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import {
  formatFileSize,
  getPdfPageCount,
  loadPdfDocument,
} from "../papers/pdfUtils";

interface ProcessStats {
  pageCount: number;
  removedLinks: number;
  removedAnnotations: number;
  removedImages: number;
  removedTextMatches: number;
  outputSize: number;
}

const DEFAULT_APP_URL = "https://alpharesult.in/app?s=frompdf";

function PdfPreviewCanvas({
  pdfDoc,
  pageNum,
  zoom,
}: {
  pdfDoc: any;
  pageNum: number;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function render() {
      if (!pdfDoc || !canvasRef.current) return;
      setRendering(true);
      setRenderError(false);

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 760 * zoom;
        const scale = Math.max(0.5, Math.min(3.0, targetWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
        if (!cancelled) setRendering(false);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("PDF preview render error:", err);
          if (!cancelled) {
            setRendering(false);
            setRenderError(true);
          }
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, zoom]);

  if (renderError) {
    return (
      <div className="w-full py-20 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-rose-400">
        Unable to render page {pageNum} preview. Try Native Viewer mode.
      </div>
    );
  }

  return (
    <div className="relative flex justify-center">
      {rendering && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 rounded-xl backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-xs text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span>Rendering page {pageNum}...</span>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto rounded-lg shadow-2xl border border-slate-700/80 bg-white"
      />
    </div>
  );
}

export default function AdminPDFPage() {
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Source File State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [sourcePageCount, setSourcePageCount] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  // Step 1: Removal Options
  const [removeLinks, setRemoveLinks] = useState(true);
  const [removeAnnotations, setRemoveAnnotations] = useState(true);
  const [removeWatermarkImages, setRemoveWatermarkImages] = useState(true);
  const [removeAllImages, setRemoveAllImages] = useState(false);
  const [removeTextWatermarks, setRemoveTextWatermarks] = useState(true);
  const [customRemoveTexts, setCustomRemoveTexts] = useState("");

  // Step 2: Alpha Result Branding Options
  const [addWatermark, setAddWatermark] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(22);
  const [addHeader, setAddHeader] = useState(true);
  const [addFooterBanner, setAddFooterBanner] = useState(true);
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL);

  // Processing & Output State
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [outputFilename, setOutputFilename] = useState<string>("AlphaResult_branded.pdf");
  const [stats, setStats] = useState<ProcessStats | null>(null);

  // Preview Controls
  const [previewSource, setPreviewSource] = useState<"processed" | "original">("processed");
  const [previewMode, setPreviewMode] = useState<"canvas" | "native">("canvas");
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPreviewPages, setTotalPreviewPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  // Cleanup object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [processedUrl]);

  // Load selected preview PDF into pdfjs
  useEffect(() => {
    let cancelled = false;
    const targetFile =
      previewSource === "processed" && processedFile ? processedFile : sourceFile;

    if (!targetFile) {
      setPdfDoc(null);
      setTotalPreviewPages(0);
      setCurrentPage(1);
      return;
    }

    async function load() {
      try {
        const doc = await loadPdfDocument(targetFile!);
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPreviewPages(doc.numPages || 1);
        setCurrentPage((prev) => Math.min(prev, doc.numPages || 1) || 1);
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
        if (!cancelled) {
          setPdfDoc(null);
          setTotalPreviewPages(0);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [previewSource, processedFile, sourceFile]);

  const handleSelectFile = useCallback(async (selected: File | null) => {
    setError("");
    if (!selected) return;

    const isPdf =
      selected.type === "application/pdf" ||
      selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please select a valid PDF file.");
      return;
    }

    const nextSourceUrl = URL.createObjectURL(selected);
    setSourceFile(selected);
    setSourceUrl(nextSourceUrl);
    setProcessedBlob(null);
    setProcessedFile(null);
    setProcessedUrl("");
    setStats(null);
    setPreviewSource("original");
    setCurrentPage(1);

    const pages = await getPdfPageCount(selected);
    setSourcePageCount(pages);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const dropped = e.dataTransfer.files?.[0] || null;
      handleSelectFile(dropped);
    },
    [handleSelectFile]
  );

  async function handleProcessPdf() {
    if (!sourceFile) {
      setError("Please select a PDF file first.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", sourceFile);
      formData.append("remove_links", String(removeLinks));
      formData.append("remove_annotations", String(removeAnnotations));
      formData.append("remove_watermark_images", String(removeWatermarkImages));
      formData.append("remove_all_images", String(removeAllImages));
      formData.append("remove_text_watermarks", String(removeTextWatermarks));
      formData.append("custom_remove_texts", customRemoveTexts);
      formData.append("add_watermark", String(addWatermark));
      formData.append("watermark_opacity", String((watermarkOpacity / 100).toFixed(2)));
      formData.append("add_header", String(addHeader));
      formData.append("add_footer_banner", String(addFooterBanner));
      formData.append("app_url", appUrl.trim() || DEFAULT_APP_URL);

      const res = await fetch(`${API_URL}/admin/pdf/rebrand`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let message = "Failed to process PDF";
        try {
          const errJson = await res.json();
          message = errJson?.detail || message;
        } catch {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const disposition = res.headers.get("content-disposition") || "";
      let filename = `${sourceFile.name.replace(/\.pdf$/i, "")}_AlphaResult.pdf`;
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) {
        filename = match[1];
      }

      const blob = await res.blob();
      const outFile = new File([blob], filename, { type: "application/pdf" });
      const nextUrl = URL.createObjectURL(blob);

      setProcessedBlob(blob);
      setProcessedFile(outFile);
      setProcessedUrl(nextUrl);
      setOutputFilename(filename);
      setPreviewSource("processed");
      setCurrentPage(1);

      setStats({
        pageCount: Number(res.headers.get("x-page-count") || sourcePageCount || 0),
        removedLinks: Number(res.headers.get("x-removed-links") || 0),
        removedAnnotations: Number(res.headers.get("x-removed-annotations") || 0),
        removedImages: Number(res.headers.get("x-removed-images") || 0),
        removedTextMatches: Number(res.headers.get("x-removed-text-matches") || 0),
        outputSize: blob.size,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong while processing the PDF.");
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!processedBlob || !processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleReset() {
    setSourceFile(null);
    setSourceUrl("");
    setSourcePageCount(0);
    setProcessedBlob(null);
    setProcessedFile(null);
    setProcessedUrl("");
    setStats(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300 gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Loading PDF Branding Studio...</p>
      </div>
    );
  }

  if (!user || !["admin", "superalpha"].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-4">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center max-w-sm">
          <Shield size={28} className="mx-auto text-rose-400 mb-2" />
          <p className="text-rose-300 font-semibold">Admin access required</p>
          <Link
            href="/"
            className="inline-block mt-4 text-xs text-indigo-400 hover:underline"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const activePreviewUrl =
    previewSource === "processed" && processedUrl ? processedUrl : sourceUrl;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <Link
              href="/admin"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  PDF Branding &amp; Watermark Studio
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Strip third-party watermarks &amp; links, apply Alpha Result branding, preview every page, then download.
              </p>
            </div>
          </div>

          {processedBlob && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition active:scale-95"
            >
              <Download size={16} />
              <span>Download Branded PDF</span>
            </button>
          )}
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: UPLOAD + OPTIONS */}
          <div className="lg:col-span-5 space-y-5">
            {/* UPLOAD CARD */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload size={15} className="text-indigo-400" />
                  <span>1. Upload Source PDF</span>
                </h2>
                {sourceFile && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
                  dragActive
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-slate-700 hover:border-indigo-500/60 bg-slate-950/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {sourceFile ? (
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {sourceFile.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatFileSize(sourceFile.size)}
                        {sourcePageCount > 0 ? ` • ${sourcePageCount} page${sourcePageCount > 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-indigo-400 shrink-0">
                      Change
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <Upload size={22} className="mx-auto text-indigo-400" />
                    <p className="text-sm font-medium text-slate-200">
                      Click to choose or drag &amp; drop a PDF
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports syllabus, question papers, notes &amp; scanned PDFs
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 1: REMOVAL OPTIONS */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Eraser size={15} className="text-rose-400" />
                <span>2. Remove Existing Branding</span>
              </h2>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeLinks}
                    onChange={(e) => setRemoveLinks(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Remove all existing hyperlinks
                    </span>
                    <span className="text-slate-400">
                      Deletes third-party clickable URLs &amp; link overlays
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeAnnotations}
                    onChange={(e) => setRemoveAnnotations(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Remove annotations &amp; stamps
                    </span>
                    <span className="text-slate-400">
                      Clears PDF watermark, stamp, and popup annotations
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeWatermarkImages}
                    onChange={(e) => setRemoveWatermarkImages(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Remove watermark &amp; repeated logo images
                    </span>
                    <span className="text-slate-400">
                      Detects repeated page logos &amp; background watermark overlays (safe on scanned PDFs)
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeTextWatermarks}
                    onChange={(e) => setRemoveTextWatermarks(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Remove diagonal, faint &amp; promo text watermarks
                    </span>
                    <span className="text-slate-400">
                      Redacts rotated/light watermarks and header/footer URLs
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeAllImages}
                    onChange={(e) => setRemoveAllImages(e.target.checked)}
                    className="mt-0.5 accent-amber-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-amber-300 block">
                      Strip all images on text/vector pages
                    </span>
                    <span className="text-slate-400">
                      Enable for single-page PDFs with embedded corner/header logos
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-1 space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Custom text or domains to remove (optional)
                </label>
                <input
                  type="text"
                  value={customRemoveTexts}
                  onChange={(e) => setCustomRemoveTexts(e.target.value)}
                  placeholder="e.g. example.com, Click to Join, Telegram"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* STEP 2: ALPHA RESULT BRANDING */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-400" />
                <span>3. Add Alpha Result Branding</span>
              </h2>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addWatermark}
                    onChange={(e) => setAddWatermark(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-slate-200 block">
                      Center Alpha Result logo watermark
                    </span>
                    <span className="text-slate-400">
                      Placed underneath text on digital PDFs so readability stays crisp
                    </span>
                  </div>
                </label>

                {addWatermark && (
                  <div className="pl-6 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Watermark visibility</span>
                      <span className="font-mono text-indigo-300">{watermarkOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={40}
                      step={2}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addHeader}
                    onChange={(e) => setAddHeader(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Top brand header strip
                    </span>
                    <span className="text-slate-400">
                      Official logo + Install Alpha Result App link (auto-fits margins)
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addFooterBanner}
                    onChange={(e) => setAddFooterBanner(e.target.checked)}
                    className="mt-0.5 accent-indigo-500 rounded"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">
                      Bottom App-Install card banner
                    </span>
                    <span className="text-slate-400">
                      Syllabus, PYQs, Solutions, Quiz, Attendance Tracker, CGPA Calculator &amp; Results
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-1 space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Link2 size={12} className="text-indigo-400" />
                  <span>App Install Hyperlink</span>
                </label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder={DEFAULT_APP_URL}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                onClick={handleProcessPdf}
                disabled={!sourceFile || processing}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-950/50 transition active:scale-[0.99]"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Cleaning &amp; Branding PDF...</span>
                  </>
                ) : processedBlob ? (
                  <>
                    <RefreshCw size={16} />
                    <span>Re-Process &amp; Update Preview</span>
                  </>
                ) : (
                  <>
                    <Layers size={16} />
                    <span>Process &amp; Preview PDF</span>
                  </>
                )}
              </button>

              {error && (
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PREVIEW & DOWNLOAD */}
          <div className="lg:col-span-7 space-y-4">
            {/* STATS BANNER */}
            {stats && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                    <CheckCircle2 size={17} />
                    <span>Branded PDF Ready — Preview below before downloading</span>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  >
                    <Download size={14} />
                    <span>Download ({formatFileSize(stats.outputSize)})</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-2">
                    <div className="text-sm font-bold text-white">{stats.pageCount}</div>
                    <div className="text-[10px] text-slate-400">Pages</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-2">
                    <div className="text-sm font-bold text-rose-300">{stats.removedImages}</div>
                    <div className="text-[10px] text-slate-400">Images Stripped</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-2">
                    <div className="text-sm font-bold text-amber-300">{stats.removedLinks}</div>
                    <div className="text-[10px] text-slate-400">Links Removed</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-2">
                    <div className="text-sm font-bold text-sky-300">{stats.removedTextMatches}</div>
                    <div className="text-[10px] text-slate-400">Text Watermarks</div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2 px-2">
                    <div className="text-sm font-bold text-indigo-300">{stats.removedAnnotations}</div>
                    <div className="text-[10px] text-slate-400">Annotations</div>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
              {/* PREVIEW TOOLBAR */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Eye size={15} className="text-indigo-400" />
                  <span className="text-xs font-bold text-white">PDF Preview</span>

                  {processedBlob && sourceFile && (
                    <div className="ml-2 inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                      <button
                        onClick={() => setPreviewSource("processed")}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          previewSource === "processed"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Branded
                      </button>
                      <button
                        onClick={() => setPreviewSource("original")}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          previewSource === "original"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  )}
                </div>

                {activePreviewUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Canvas vs Native Iframe toggle */}
                    <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                      <button
                        onClick={() => setPreviewMode("canvas")}
                        className={`px-2 py-1 rounded-md font-medium transition ${
                          previewMode === "canvas"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Pages
                      </button>
                      <button
                        onClick={() => setPreviewMode("native")}
                        className={`px-2 py-1 rounded-md font-medium transition ${
                          previewMode === "native"
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Native Viewer
                      </button>
                    </div>

                    {previewMode === "canvas" && totalPreviewPages > 0 && (
                      <>
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-xs">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className="p-0.5 text-slate-300 disabled:opacity-30 hover:text-white"
                            title="Previous page"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="px-1.5 text-[11px] font-mono text-slate-300">
                            {currentPage} / {totalPreviewPages}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPreviewPages, p + 1))
                            }
                            disabled={currentPage >= totalPreviewPages}
                            className="p-0.5 text-slate-300 disabled:opacity-30 hover:text-white"
                            title="Next page"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1 text-xs">
                          <button
                            onClick={() =>
                              setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))
                            }
                            className="p-0.5 text-slate-300 hover:text-white"
                            title="Zoom out"
                          >
                            <ZoomOut size={14} />
                          </button>
                          <span className="px-1 text-[11px] font-mono text-slate-300">
                            {Math.round(zoom * 100)}%
                          </span>
                          <button
                            onClick={() =>
                              setZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))
                            }
                            className="p-0.5 text-slate-300 hover:text-white"
                            title="Zoom in"
                          >
                            <ZoomIn size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* PREVIEW BODY */}
              <div className="p-4 sm:p-6 min-h-[540px] max-h-[820px] overflow-auto bg-slate-950/70">
                {!activePreviewUrl ? (
                  <div className="h-[460px] flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                    <FileText size={36} className="text-slate-700" />
                    <p className="text-sm font-medium text-slate-400">
                      Upload a PDF on the left to preview &amp; rebrand it
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Once processed, you can inspect every page, switch between Original and Branded views, test clickable links in Native Viewer, and download.
                    </p>
                  </div>
                ) : previewMode === "native" ? (
                  <iframe
                    src={activePreviewUrl}
                    title="PDF Native Preview"
                    className="w-full h-[720px] rounded-xl border border-slate-800 bg-white"
                  />
                ) : pdfDoc ? (
                  <div className="space-y-4">
                    <PdfPreviewCanvas
                      pdfDoc={pdfDoc}
                      pageNum={currentPage}
                      zoom={zoom}
                    />
                  </div>
                ) : (
                  <div className="h-[460px] flex items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                    <span>Loading PDF pages...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
