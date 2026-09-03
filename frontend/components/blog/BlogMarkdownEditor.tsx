"use client";

import React from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-[#0B0F1A] border border-white/10 rounded-xl flex items-center justify-center text-xs text-slate-500">
      Loading Markdown Editor...
    </div>
  ),
});

interface BlogMarkdownEditorProps {
  value: string;
  onChange: (value?: string) => void;
  height?: number;
}

export default function BlogMarkdownEditor({
  value,
  onChange,
  height = 360,
}: BlogMarkdownEditorProps) {
  return (
    <div data-color-mode="dark" className="w-full">
      <MDEditor
        value={value}
        onChange={onChange}
        height={height}
        preview="live"
        className="!border-white/10 !bg-[#0B0F1A] !rounded-xl overflow-hidden"
      />
    </div>
  );
}
