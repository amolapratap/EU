"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Info, AlertTriangle, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";

export interface BlogTable {
  title?: string;
  columns: string[];
  rows: string[][];
}

export interface BlogSubTopic {
  title: string;
  description?: string;
  points?: string[];
}

export interface BlogAlertBox {
  type?: "info" | "warning" | "success" | "alert";
  title?: string;
  message: string;
}

export interface BlogBlock {
  id: string;
  type: "markdown" | "image" | "table" | "sub_topic" | "alert";
  data: any;
}

interface BlogRendererProps {
  blocks?: BlogBlock[];
  content?: string;
  alertBox?: BlogAlertBox | null;
  subTopics?: BlogSubTopic[];
  tables?: BlogTable[];
}

export default function BlogRenderer({
  blocks,
  content,
  alertBox,
  subTopics,
  tables,
}: BlogRendererProps) {
  // If modular blocks are present, render them in their exact chosen sequential order!
  if (blocks && blocks.length > 0) {
    return (
      <div className="space-y-8 text-slate-800 leading-relaxed">
        {blocks.map((block) => (
          <div key={block.id}>
            {/* 1. MARKDOWN / LATEX */}
            {block.type === "markdown" && block.data?.content && (
              <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600 hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {block.data.content}
                </ReactMarkdown>
              </div>
            )}

            {/* 2. IMAGE BLOCK */}
            {block.type === "image" && block.data?.url && (
              <figure className="my-6 space-y-2">
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50 flex items-center justify-center max-h-[500px]">
                  <img
                    src={block.data.url}
                    alt={block.data.alt || block.data.caption || "Blog illustration"}
                    className="max-h-[500px] w-auto max-w-full object-contain mx-auto"
                    loading="lazy"
                  />
                </div>
                {block.data.caption && (
                  <figcaption className="text-center text-xs text-slate-500 italic">
                    {block.data.caption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* 3. CUSTOM TABLE */}
            {block.type === "table" && (
              <TableView table={block.data as BlogTable} />
            )}

            {/* 4. SUB-TOPIC SECTION */}
            {block.type === "sub_topic" && (
              <SubTopicView subTopic={block.data as BlogSubTopic} />
            )}

            {/* 5. ALERT CALLOUT BANNER */}
            {block.type === "alert" && block.data?.message && (
              <AlertBoxView alert={block.data as BlogAlertBox} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Legacy fallback renderer
  return (
    <div className="space-y-8 text-slate-800 leading-relaxed">
      {alertBox && alertBox.message && <AlertBoxView alert={alertBox} />}

      {content && content.trim() && (
        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600 hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {tables && tables.length > 0 && (
        <div className="space-y-6">
          {tables.map((tbl, idx) => (
            <TableView key={idx} table={tbl} />
          ))}
        </div>
      )}

      {subTopics && subTopics.length > 0 && (
        <div className="space-y-6 pt-4">
          {subTopics.map((sub, sIdx) => (
            <SubTopicView key={sIdx} subTopic={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function TableView({ table }: { table: BlogTable }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs my-4">
      {table.title && (
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-800">
            {table.title}
          </h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          {table.columns && table.columns.length > 0 && (
            <thead className="bg-slate-100/70 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                {table.columns.map((col, cIdx) => (
                  <th key={cIdx} className="px-4 py-3 min-w-[120px]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-200">
            {table.rows && table.rows.length > 0 ? (
              table.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={table.columns?.length || 1}
                  className="px-4 py-3 text-center text-slate-400 italic"
                >
                  No rows added yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubTopicView({ subTopic }: { subTopic: BlogSubTopic }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs my-4">
      <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
        {subTopic.title}
      </h3>

      {subTopic.description && (
        <div className="prose prose-slate max-w-none text-slate-700 text-sm mb-3">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {subTopic.description}
          </ReactMarkdown>
        </div>
      )}

      {subTopic.points && subTopic.points.length > 0 && (
        <ul className="space-y-1.5 pl-4 text-sm text-slate-600 list-disc">
          {subTopic.points.map((pt, pIdx) => (
            <li key={pIdx} className="leading-normal">
              {pt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertBoxView({ alert }: { alert: BlogAlertBox }) {
  const type = alert.type || "info";

  const styles = {
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    alert: {
      bg: "bg-red-50 border-red-200 text-red-900",
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    },
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
  }[type] || {
    bg: "bg-blue-50 border-blue-200 text-blue-900",
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 my-4 ${styles.bg}`}>
      {styles.icon}
      <div className="text-sm">
        {alert.title && <p className="font-bold mb-0.5">{alert.title}</p>}
        <p className="whitespace-pre-line">{alert.message}</p>
      </div>
    </div>
  );
}
