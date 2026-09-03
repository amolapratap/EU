"use client";

import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  Layers,
  AlertCircle,
  Plus,
  Type,
  X,
} from "lucide-react";
import BlogMarkdownEditor from "./BlogMarkdownEditor";
import LocalImageUploader from "./LocalImageUploader";
import { BlogTable, BlogSubTopic, BlogAlertBox } from "./BlogRenderer";

export interface BlogBlock {
  id: string;
  type: "markdown" | "image" | "table" | "sub_topic" | "alert";
  data: any;
}

interface ModularBlockEditorProps {
  blocks: BlogBlock[];
  onChange: (blocks: BlogBlock[]) => void;
}

export default function ModularBlockEditor({
  blocks,
  onChange,
}: ModularBlockEditorProps) {
  function addBlock(type: BlogBlock["type"], insertIndex?: number) {
    const newId = `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let initialData: any = {};

    switch (type) {
      case "markdown":
        initialData = { content: "" };
        break;
      case "image":
        initialData = { url: "", caption: "", alt: "" };
        break;
      case "table":
        initialData = {
          title: `Table ${blocks.filter((b) => b.type === "table").length + 1}`,
          columns: ["Column 1", "Column 2"],
          rows: [["", ""]],
        };
        break;
      case "sub_topic":
        initialData = {
          title: `Sub-Topic ${blocks.filter((b) => b.type === "sub_topic").length + 1}`,
          description: "",
          points: [""],
        };
        break;
      case "alert":
        initialData = {
          type: "info",
          title: "Important Notice",
          message: "",
        };
        break;
    }

    const newBlock: BlogBlock = { id: newId, type, data: initialData };

    if (insertIndex !== undefined && insertIndex >= 0) {
      const next = [...blocks];
      next.splice(insertIndex + 1, 0, newBlock);
      onChange(next);
    } else {
      onChange([...blocks, newBlock]);
    }
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...blocks];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChange(next);
  }

  function moveDown(index: number) {
    if (index >= blocks.length - 1) return;
    const next = [...blocks];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChange(next);
  }

  function removeBlock(index: number) {
    const next = blocks.filter((_, idx) => idx !== index);
    onChange(next);
  }

  function updateBlockData(index: number, partialData: any) {
    const next = [...blocks];
    next[index] = {
      ...next[index],
      data: { ...next[index].data, ...partialData },
    };
    onChange(next);
  }

  // Specific helpers for Table block
  function updateTable(index: number, tableData: Partial<BlogTable>) {
    const currentTable = blocks[index].data as BlogTable;
    updateBlockData(index, { ...currentTable, ...tableData });
  }

  function addTableCol(index: number) {
    const tbl = blocks[index].data as BlogTable;
    const newColName = `Column ${tbl.columns.length + 1}`;
    const newCols = [...tbl.columns, newColName];
    const newRows = tbl.rows.map((r) => [...r, ""]);
    updateTable(index, { columns: newCols, rows: newRows });
  }

  function removeTableCol(index: number, colIdx: number) {
    const tbl = blocks[index].data as BlogTable;
    if (tbl.columns.length <= 1) return;
    const newCols = tbl.columns.filter((_, i) => i !== colIdx);
    const newRows = tbl.rows.map((r) => r.filter((_, i) => i !== colIdx));
    updateTable(index, { columns: newCols, rows: newRows });
  }

  function addTableRow(index: number) {
    const tbl = blocks[index].data as BlogTable;
    const newRow = new Array(tbl.columns.length).fill("");
    updateTable(index, { rows: [...tbl.rows, newRow] });
  }

  function removeTableRow(index: number, rowIdx: number) {
    const tbl = blocks[index].data as BlogTable;
    const newRows = tbl.rows.filter((_, i) => i !== rowIdx);
    updateTable(index, { rows: newRows });
  }

  // Specific helpers for Sub-Topic block
  function addSubTopicPoint(index: number) {
    const sub = blocks[index].data as BlogSubTopic;
    const pts = sub.points || [];
    updateBlockData(index, { points: [...pts, ""] });
  }

  function removeSubTopicPoint(index: number, ptIdx: number) {
    const sub = blocks[index].data as BlogSubTopic;
    const pts = (sub.points || []).filter((_, i) => i !== ptIdx);
    updateBlockData(index, { points: pts });
  }

  function updateSubTopicPoint(index: number, ptIdx: number, val: string) {
    const sub = blocks[index].data as BlogSubTopic;
    const pts = [...(sub.points || [])];
    pts[ptIdx] = val;
    updateBlockData(index, { points: pts });
  }

  return (
    <div className="space-y-6">
      {/* ===== TOP ADD TOOLBAR ===== */}
      <div className="bg-[#151D33] border border-white/15 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
            Add Section to Article
          </span>
          <span className="text-[11px] text-slate-400">
            Add anywhere • Reorder anytime
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => addBlock("markdown")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <Type className="w-3.5 h-3.5" />
            + Text / LaTeX
          </button>

          <button
            type="button"
            onClick={() => addBlock("image")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            + Local Image
          </button>

          <button
            type="button"
            onClick={() => addBlock("table")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <TableIcon className="w-3.5 h-3.5" />
            + Custom Table
          </button>

          <button
            type="button"
            onClick={() => addBlock("sub_topic")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            + Sub-Topic
          </button>

          <button
            type="button"
            onClick={() => addBlock("alert")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            + Alert Banner
          </button>
        </div>
      </div>

      {/* ===== BLOCKS CONTAINER ===== */}
      {blocks.length === 0 ? (
        <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-300">
            No content sections added yet
          </p>
          <p className="text-xs text-slate-500">
            Click any button above to add Text/LaTeX, Upload Images from local device, Tables, Sub-topics, or Alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === blocks.length - 1;

            return (
              <div
                key={block.id}
                className="bg-[#11172C] border border-white/15 rounded-xl overflow-hidden transition shadow-sm hover:border-white/25"
              >
                {/* Block Header & Reorder Bar */}
                <div className="bg-[#151D33] px-4 py-2.5 flex items-center justify-between border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>

                    {block.type === "markdown" && (
                      <span className="flex items-center gap-1 font-semibold text-indigo-300">
                        <Type className="w-3.5 h-3.5" /> Markdown & LaTeX Text
                      </span>
                    )}

                    {block.type === "image" && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-300">
                        <ImageIcon className="w-3.5 h-3.5" /> Image (Local / URL)
                      </span>
                    )}

                    {block.type === "table" && (
                      <span className="flex items-center gap-1 font-semibold text-blue-300">
                        <TableIcon className="w-3.5 h-3.5" /> Custom Table
                      </span>
                    )}

                    {block.type === "sub_topic" && (
                      <span className="flex items-center gap-1 font-semibold text-purple-300">
                        <Layers className="w-3.5 h-3.5" /> Sub-Topic & Points
                      </span>
                    )}

                    {block.type === "alert" && (
                      <span className="flex items-center gap-1 font-semibold text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5" /> Alert Banner
                      </span>
                    )}
                  </div>

                  {/* Move Up, Move Down, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveUp(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveDown(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeBlock(idx)}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition ml-1 cursor-pointer"
                      title="Remove section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Block Content Body */}
                <div className="p-4">
                  {/* TYPE 1: MARKDOWN */}
                  {block.type === "markdown" && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400">
                        Write text with headings, lists, bold, and LaTeX math like <code>$E=mc^2$</code>.
                      </p>
                      <BlogMarkdownEditor
                        value={block.data.content || ""}
                        onChange={(v) => updateBlockData(idx, { content: v || "" })}
                        height={240}
                      />
                    </div>
                  )}

                  {/* TYPE 2: IMAGE */}
                  {block.type === "image" && (
                    <div className="space-y-3">
                      <LocalImageUploader
                        value={block.data.url || ""}
                        onChange={(url) => updateBlockData(idx, { url })}
                        label="Upload Image for this Section"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Image Caption (e.g. Figure 1: BEU Examination Schedule Diagram)"
                          value={block.data.caption || ""}
                          onChange={(e) => updateBlockData(idx, { caption: e.target.value })}
                          className="bg-[#0B0F1A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Image Alt Text (for accessibility & SEO)"
                          value={block.data.alt || ""}
                          onChange={(e) => updateBlockData(idx, { alt: e.target.value })}
                          className="bg-[#0B0F1A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* TYPE 3: TABLE */}
                  {block.type === "table" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={block.data.title || ""}
                          onChange={(e) => updateTable(idx, { title: e.target.value })}
                          placeholder="Table Title / Description (e.g. 7th Semester Exam Datesheet)"
                          className="flex-1 bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => addTableCol(idx)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        >
                          + Add Column
                        </button>
                        <button
                          type="button"
                          onClick={() => addTableRow(idx)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        >
                          + Add Row
                        </button>
                      </div>

                      {/* Columns */}
                      <div className="flex flex-wrap gap-2">
                        {(block.data.columns || []).map((col: string, cIdx: number) => (
                          <div
                            key={cIdx}
                            className="flex items-center gap-1 bg-[#0B0F1A] border border-white/10 rounded-md px-2 py-1 text-xs"
                          >
                            <input
                              type="text"
                              value={col}
                              onChange={(e) => {
                                const newCols = [...block.data.columns];
                                newCols[cIdx] = e.target.value;
                                updateTable(idx, { columns: newCols });
                              }}
                              className="bg-transparent text-white focus:outline-none w-24 text-xs font-semibold"
                            />
                            {block.data.columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTableCol(idx, cIdx)}
                                className="text-slate-500 hover:text-red-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Rows Table */}
                      <div className="overflow-x-auto max-h-56 overflow-y-auto space-y-1.5 pt-1">
                        {(block.data.rows || []).map((row: string[], rIdx: number) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">{rIdx + 1}.</span>
                            <div className="grid grid-flow-col auto-cols-fr gap-2 flex-1 min-w-[280px]">
                              {row.map((cell, cellIdx) => (
                                <input
                                  key={cellIdx}
                                  type="text"
                                  value={cell}
                                  onChange={(e) => {
                                    const newRows = [...block.data.rows];
                                    const newR = [...newRows[rIdx]];
                                    newR[cellIdx] = e.target.value;
                                    newRows[rIdx] = newR;
                                    updateTable(idx, { rows: newRows });
                                  }}
                                  placeholder={block.data.columns[cellIdx] || `Cell`}
                                  className="bg-[#0B0F1A] border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTableRow(idx, rIdx)}
                              className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPE 4: SUB-TOPIC */}
                  {block.type === "sub_topic" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={block.data.title || ""}
                        onChange={(e) => updateBlockData(idx, { title: e.target.value })}
                        placeholder="Sub-Topic Heading (e.g. 2. Important Eligibility Changes)"
                        className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                      />
                      <textarea
                        rows={2}
                        value={block.data.description || ""}
                        onChange={(e) => updateBlockData(idx, { description: e.target.value })}
                        placeholder="Paragraph description for this sub-section..."
                        className="w-full bg-[#0B0F1A] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />

                      {/* Bullet points */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Key Bullet Points
                          </span>
                          <button
                            type="button"
                            onClick={() => addSubTopicPoint(idx)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Point
                          </button>
                        </div>

                        {(block.data.points || []).map((pt: string, pIdx: number) => (
                          <div key={pIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-4">•</span>
                            <input
                              type="text"
                              value={pt}
                              onChange={(e) => updateSubTopicPoint(idx, pIdx, e.target.value)}
                              placeholder={`Point ${pIdx + 1}`}
                              className="flex-1 bg-[#0B0F1A] border border-white/10 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeSubTopicPoint(idx, pIdx)}
                              className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPE 5: ALERT */}
                  {block.type === "alert" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={block.data.type || "info"}
                          onChange={(e) => updateBlockData(idx, { type: e.target.value })}
                          className="bg-[#0B0F1A] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="info">Info (Blue)</option>
                          <option value="warning">Warning (Amber)</option>
                          <option value="alert">Critical Alert (Red)</option>
                          <option value="success">Success / Verified (Emerald)</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Callout Heading (e.g. Official BEU Notice No. 492)"
                          value={block.data.title || ""}
                          onChange={(e) => updateBlockData(idx, { title: e.target.value })}
                          className="sm:col-span-2 bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Alert Message Text..."
                        value={block.data.message || ""}
                        onChange={(e) => updateBlockData(idx, { message: e.target.value })}
                        className="w-full bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
