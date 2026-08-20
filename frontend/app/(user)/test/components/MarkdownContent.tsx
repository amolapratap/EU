"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export default function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  if (!content?.trim()) {
    return <span className="text-slate-400 italic">No content</span>;
  }

  return (
    <div className={`prose prose-slate max-w-none prose-p:my-1 prose-headings:my-2 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
