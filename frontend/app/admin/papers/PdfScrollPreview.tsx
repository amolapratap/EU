"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  X,
  Maximize2,
  Minimize2,
  ChevronRight,
  Layers,
  Eye,
  FileText,
  RefreshCw,
  Sparkles,
  Plus,
} from "lucide-react";
import { loadPdfDocument } from "./pdfUtils";

/* =====================================================
   TYPES
===================================================== */

export interface PdfScrollPreviewProps {
  paperId: string;
  paperName: string;
  file: File | null;
  previewUrl: string;
  pageCount: number;
  selectedPages: number[];
  onTogglePage: (pageNum: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  imageItems?: { id: string; file: File; preview: string; name: string }[];
}

/* =====================================================
   CANVAS PAGE RENDERER (USING PDFJS)
===================================================== */

function PdfPageCanvas({
  pdfDoc,
  pageNum,
  isModal = false,
}: {
  pdfDoc: any;
  pageNum: number;
  isModal?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancel = false;
    let renderTask: any = null;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancel) return;

        const unscaled = page.getViewport({ scale: 1.0 });
        const targetWidth = isModal ? 850 : 540;
        const scale = Math.max(0.7, Math.min(isModal ? 2.0 : 1.4, targetWidth / unscaled.width));
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
        if (!cancel) setRendered(true);
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNum} render error:`, err);
          if (!cancel) setError(true);
        }
      }
    }

    renderPage();

    return () => {
      cancel = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNum, isModal]);

  if (error) {
    return (
      <div className="py-12 px-4 text-center text-xs text-slate-500 bg-slate-900/60 rounded">
        Page {pageNum} preview unavailable
      </div>
    );
  }

  return (
    <div className="relative flex justify-center bg-white rounded-md overflow-hidden shadow-inner">
      {!rendered && (
        <div className="w-full h-48 sm:h-64 bg-slate-800/80 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Rendering Page {pageNum}...
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full h-auto object-contain transition-opacity duration-200 ${
          rendered ? "opacity-100" : "hidden"
        }`}
      />
    </div>
  );
}

/* =====================================================
   MAIN INTERACTIVE PDF SCROLL PREVIEW COMPONENT
===================================================== */

export default function PdfScrollPreview({
  paperId,
  paperName,
  file,
  previewUrl,
  pageCount,
  selectedPages,
  onTogglePage,
  onSelectAll,
  onClear,
  imageItems = [],
}: PdfScrollPreviewProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [viewMode, setViewMode] = useState<"stream" | "iframe">("stream");
  const [isExpandedModal, setIsExpandedModal] = useState(false);

  // Active page tracking for inline stream & expanded modal
  const [activePage, setActivePage] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const hasImages = imageItems.length > 0;
  const totalPages = Math.max(1, pageCount || imageItems.length || 1);

  // Load PDF Document with pdfjs-dist if file is provided and not just images
  useEffect(() => {
    let cancel = false;
    if (!file || hasImages) {
      setPdfDoc(null);
      return;
    }

    async function load() {
      try {
        setLoadingPdf(true);
        setPdfError(false);
        const doc = await loadPdfDocument(file!);
        if (!cancel) {
          setPdfDoc(doc);
        }
      } catch (err) {
        console.error("Failed to load PDF in preview:", err);
        if (!cancel) setPdfError(true);
      } finally {
        if (!cancel) setLoadingPdf(false);
      }
    }

    load();

    return () => {
      cancel = true;
    };
  }, [file, hasImages]);

  // Scroll listener for detecting current active page
  const handleScroll = (ref: React.RefObject<HTMLDivElement>) => {
    const container = ref.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const pageCards = container.querySelectorAll<HTMLElement>("[data-page-card]");

    let closestPage = 1;
    let minDistance = Infinity;

    pageCards.forEach(card => {
      const num = parseInt(card.getAttribute("data-page-card") || "1", 10);
      const topOffset = card.offsetTop - container.offsetTop;
      const distance = Math.abs(topOffset - scrollTop - 50);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = num;
      }
    });

    setActivePage(closestPage);
  };

  const jumpToPage = (num: number, ref: React.RefObject<HTMLDivElement>) => {
    const container = ref.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-page-card="${num}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // If pdfjs fails or user chooses iframe mode
  if (viewMode === "iframe" || pdfError) {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-[#080D1A] space-y-2 p-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">Browser PDF Viewer</span>
          {!pdfError && (
            <button
              type="button"
              onClick={() => setViewMode("stream")}
              className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
            >
              Switch to Page-by-Page Selector
            </button>
          )}
        </div>
        <iframe src={previewUrl} className="w-full h-[260px] rounded-lg border border-slate-800 bg-black" />
      </div>
    );
  }

  const isCurrentActiveSelected = selectedPages.includes(activePage);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0B101D] overflow-hidden shadow-lg space-y-0 text-slate-100">
      {/* ================= TOP CONTROLS & STATUS BAR ================= */}
      <div className="bg-[#0F1629] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold font-mono text-[11px]">
            {selectedPages.length} of {totalPages} Pages Selected
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Scroll to view & click any page to select
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onSelectAll}
            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsExpandedModal(true)}
            title="Expand into full-size inspection modal"
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer ml-1"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* ================= FLOATING STICKY SCROLL INDICATOR ================= */}
      <div className="sticky top-0 z-20 bg-[#090D18]/95 backdrop-blur-md px-3 py-2 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">
              Page {activePage} of {totalPages}
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isCurrentActiveSelected
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-800/90 text-slate-400 border border-slate-700/80"
            }`}
          >
            {isCurrentActiveSelected ? "✓ Included" : "Excluded"}
          </span>
        </div>

        {/* QUICK ACTION FOR CURRENT SCROLLED PAGE */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTogglePage(activePage)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isCurrentActiveSelected
                ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-950/40"
            }`}
          >
            {isCurrentActiveSelected ? (
              <>
                <X size={12} />
                <span>Exclude Page {activePage}</span>
              </>
            ) : (
              <>
                <Check size={12} />
                <span>Select Page {activePage}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= QUICK PAGE JUMP STRIP ================= */}
      {totalPages > 1 && (
        <div className="bg-[#080D1A] px-3 py-1.5 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
          <span className="text-[10px] font-semibold text-slate-500 shrink-0 mr-1 uppercase">
            Jump to:
          </span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => {
            const isSel = selectedPages.includes(num);
            const isAct = num === activePage;
            return (
              <button
                key={num}
                type="button"
                onClick={() => jumpToPage(num, scrollRef)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition shrink-0 cursor-pointer ${
                  isAct
                    ? "bg-indigo-600 text-white ring-1 ring-indigo-400"
                    : isSel
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title={`Jump to Page ${num} (${isSel ? "Selected" : "Excluded"})`}
              >
                P{num}
              </button>
            );
          })}
        </div>
      )}

      {/* ================= SCROLLABLE PAGES STREAM ================= */}
      <div
        ref={scrollRef}
        onScroll={() => handleScroll(scrollRef)}
        className="max-h-[380px] overflow-y-auto p-3 space-y-4 bg-[#080B14] scroll-smooth"
      >
        {loadingPdf && !hasImages && (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-400" />
            <span>Loading PDF pages for interactive inspection...</span>
          </div>
        )}

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
          const isSelected = selectedPages.includes(pageNum);
          const isImage = hasImages && imageItems[pageNum - 1];

          return (
            <div
              key={pageNum}
              data-page-card={pageNum}
              id={`page-card-${paperId}-${pageNum}`}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isSelected
                  ? "border-emerald-500/80 bg-[#0F172A] shadow-md shadow-emerald-500/10"
                  : "border-slate-800 bg-[#0B0F1C] opacity-75 hover:opacity-100 hover:border-slate-700"
              }`}
            >
              {/* PAGE CARD HEADER BAR */}
              <div
                onClick={() => onTogglePage(pageNum)}
                className={`px-3.5 py-2.5 flex items-center justify-between border-b cursor-pointer select-none transition-colors ${
                  isSelected
                    ? "bg-emerald-950/30 border-emerald-500/30"
                    : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                    }`}
                  >
                    PAGE {pageNum}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    of {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onTogglePage(pageNum);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check size={13} />
                        <span>Included in Upload</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Click to Include</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PAGE CONTENT CONTAINER (CANVAS OR IMAGE) */}
              <div
                onClick={() => onTogglePage(pageNum)}
                className="p-3 cursor-pointer group/page relative"
                title={`Click anywhere to ${isSelected ? "exclude" : "include"} Page ${pageNum}`}
              >
                {/* SUBTLE HOVER OVERLAY HINT */}
                <div className="absolute inset-0 bg-indigo-600/0 group-hover/page:bg-indigo-600/5 transition-colors pointer-events-none rounded-b-xl" />

                {isImage ? (
                  <div className="flex justify-center bg-white rounded-md overflow-hidden p-1">
                    <img
                      src={imageItems[pageNum - 1].preview}
                      alt={`Page ${pageNum}`}
                      className="max-w-full h-auto object-contain max-h-[460px]"
                    />
                  </div>
                ) : pdfDoc ? (
                  <PdfPageCanvas pdfDoc={pdfDoc} pageNum={pageNum} />
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Page {pageNum} preview loading...
                  </div>
                )}

                {/* BOTTOM HELPER STRIP */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">
                    {isSelected ? "✅ This page WILL be uploaded" : "⬜ This page is EXCLUDED"}
                  </span>
                  <span className="text-indigo-400 group-hover/page:underline">
                    {isSelected ? "Click to exclude" : "Click to select"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= EXPANDED FULLSCREEN MODAL ================= */}
      {isExpandedModal && typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={() => setIsExpandedModal(false)}
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-[#0F1629] w-full max-w-4xl h-[92vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col text-slate-100 overflow-hidden my-auto"
            >
              {/* MODAL HEADER */}
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0B101D] shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">
                      Inspect & Select Pages: {paperName || "Question Paper"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Showing Page {activePage} of {totalPages} •{" "}
                    <strong className="text-indigo-300">{selectedPages.length} pages selected</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpandedModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* MODAL STICKY STATUS BAR */}
              <div className="bg-[#090D18] px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="font-bold text-white">
                    Currently Viewing: Page {activePage} of {totalPages}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCurrentActiveSelected
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCurrentActiveSelected ? "✓ Included" : "Excluded"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePage(activePage)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isCurrentActiveSelected
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                  }`}
                >
                  {isCurrentActiveSelected ? (
                    <>
                      <X size={12} />
                      <span>Exclude Page {activePage}</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Select Page {activePage}</span>
                    </>
                  )}
                </button>
              </div>

              {/* MODAL SCROLLABLE PAGES */}
              <div
                ref={modalScrollRef}
                onScroll={() => handleScroll(modalScrollRef)}
                className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#080B14]"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  const isSelected = selectedPages.includes(pageNum);
                  const isImage = hasImages && imageItems[pageNum - 1];

                  return (
                    <div
                      key={`modal-${pageNum}`}
                      data-page-card={pageNum}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isSelected
                          ? "border-emerald-500/80 bg-[#0F172A] shadow-xl shadow-emerald-500/10"
                          : "border-slate-800 bg-[#0B0F1C] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div
                        onClick={() => onTogglePage(pageNum)}
                        className={`px-4 py-3 flex items-center justify-between border-b cursor-pointer select-none ${
                          isSelected
                            ? "bg-emerald-950/40 border-emerald-500/30"
                            : "bg-slate-900/80 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            PAGE {pageNum} of {totalPages}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onTogglePage(pageNum);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check size={13} />
                              <span>Included</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} />
                              <span>Click to Select</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div
                        onClick={() => onTogglePage(pageNum)}
                        className="p-4 cursor-pointer"
                        title={`Click to ${isSelected ? "exclude" : "select"} Page ${pageNum}`}
                      >
                        {isImage ? (
                          <div className="flex justify-center bg-white rounded-lg p-2">
                            <img
                              src={imageItems[pageNum - 1].preview}
                              alt={`Page ${pageNum}`}
                              className="max-w-full h-auto object-contain max-h-[700px]"
                            />
                          </div>
                        ) : pdfDoc ? (
                          <PdfPageCanvas pdfDoc={pdfDoc} pageNum={pageNum} isModal={true} />
                        ) : (
                          <div className="py-16 text-center text-xs text-slate-500">
                            Loading high-res preview...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MODAL FOOTER */}
              <div className="px-5 py-3 border-t border-slate-800 bg-[#0B101D] flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span>
                  Selected: <strong className="text-white">{selectedPages.length} of {totalPages} pages</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpandedModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Done Selecting
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
