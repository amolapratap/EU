"use client";

import React, { useState } from "react";
import { Plus, Trash2, Table as TableIcon, ArrowRight, X } from "lucide-react";
import { BlogTable } from "./BlogRenderer";

interface DynamicTableEditorProps {
  tables: BlogTable[];
  onChange: (tables: BlogTable[]) => void;
}

export default function DynamicTableEditor({
  tables,
  onChange,
}: DynamicTableEditorProps) {
  function addTable() {
    const newTable: BlogTable = {
      title: `Table ${tables.length + 1}`,
      columns: ["Column 1", "Column 2"],
      rows: [["", ""]],
    };
    onChange([...tables, newTable]);
  }

  function removeTable(tableIndex: number) {
    const updated = tables.filter((_, idx) => idx !== tableIndex);
    onChange(updated);
  }

  function updateTableTitle(tableIndex: number, title: string) {
    const updated = [...tables];
    updated[tableIndex] = { ...updated[tableIndex], title };
    onChange(updated);
  }

  function addColumn(tableIndex: number) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    const newColName = `Column ${tbl.columns.length + 1}`;
    const newColumns = [...tbl.columns, newColName];
    const newRows = tbl.rows.map((row) => [...row, ""]);
    updated[tableIndex] = { ...tbl, columns: newColumns, rows: newRows };
    onChange(updated);
  }

  function removeColumn(tableIndex: number, colIndex: number) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    if (tbl.columns.length <= 1) return; // Keep at least 1 column
    const newColumns = tbl.columns.filter((_, idx) => idx !== colIndex);
    const newRows = tbl.rows.map((row) => row.filter((_, idx) => idx !== colIndex));
    updated[tableIndex] = { ...tbl, columns: newColumns, rows: newRows };
    onChange(updated);
  }

  function updateColumnName(tableIndex: number, colIndex: number, name: string) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    const newColumns = [...tbl.columns];
    newColumns[colIndex] = name;
    updated[tableIndex] = { ...tbl, columns: newColumns };
    onChange(updated);
  }

  function addRow(tableIndex: number) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    const emptyRow = new Array(tbl.columns.length).fill("");
    updated[tableIndex] = { ...tbl, rows: [...tbl.rows, emptyRow] };
    onChange(updated);
  }

  function removeRow(tableIndex: number, rowIndex: number) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    const newRows = tbl.rows.filter((_, idx) => idx !== rowIndex);
    updated[tableIndex] = { ...tbl, rows: newRows };
    onChange(updated);
  }

  function updateCell(tableIndex: number, rowIndex: number, colIndex: number, value: string) {
    const updated = [...tables];
    const tbl = updated[tableIndex];
    const newRows = tbl.rows.map((r, rIdx) => {
      if (rIdx !== rowIndex) return r;
      const newR = [...r];
      newR[colIndex] = value;
      return newR;
    });
    updated[tableIndex] = { ...tbl, rows: newRows };
    onChange(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-indigo-400" />
            Dynamic Custom Tables
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Add exam datesheets, syllabus changes, cutoffs, or comparisons
          </p>
        </div>
        <button
          type="button"
          onClick={addTable}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Table
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-slate-400">
          No custom tables added yet. Click &quot;Add Table&quot; if this blog requires structured tabular data.
        </div>
      ) : (
        tables.map((table, tIdx) => (
          <div
            key={tIdx}
            className="bg-[#151D33] border border-white/10 rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={table.title || ""}
                onChange={(e) => updateTableTitle(tIdx, e.target.value)}
                placeholder="Table Title / Description (e.g., Exam Schedule)"
                className="bg-[#0B0F1A] border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 flex-1"
              />
              <button
                type="button"
                onClick={() => removeTable(tIdx)}
                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                title="Delete Table"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Columns setup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Columns ({table.columns.length})
                </span>
                <button
                  type="button"
                  onClick={() => addColumn(tIdx)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Column
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {table.columns.map((col, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-1 bg-[#0B0F1A] border border-white/10 rounded-md px-2 py-1">
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => updateColumnName(tIdx, cIdx, e.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none w-full"
                      placeholder={`Col ${cIdx + 1}`}
                    />
                    {table.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(tIdx, cIdx)}
                        className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                        title="Remove Column"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows setup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Rows ({table.rows.length})
                </span>
                <button
                  type="button"
                  onClick={() => addRow(tIdx)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>

              <div className="space-y-2 overflow-x-auto max-h-60 overflow-y-auto pr-1">
                {table.rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-4">{rIdx + 1}.</span>
                    <div className="grid grid-flow-col auto-cols-fr gap-2 flex-1 min-w-[280px]">
                      {row.map((cell, cIdx) => (
                        <input
                          key={cIdx}
                          type="text"
                          value={cell}
                          onChange={(e) => updateCell(tIdx, rIdx, cIdx, e.target.value)}
                          placeholder={table.columns[cIdx] || `Cell`}
                          className="bg-[#0B0F1A] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(tIdx, rIdx)}
                      className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
