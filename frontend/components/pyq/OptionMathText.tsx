"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { sanitizeLatexMath } from "@/lib/latexSanitizer";

interface OptionMathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders multiple-choice question options with full dynamic LaTeX mathematics and Markdown support.
 * Automatically cleans broken/mismatched LaTeX delimiters so equations render seamlessly.
 */
export default function OptionMathText({ text, className = "" }: OptionMathTextProps) {
  const sanitized = useMemo(() => (text ? sanitizeLatexMath(text) : ""), [text]);
  if (!sanitized) return null;

  return (
    <span className={`inline-block text-inherit leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span className="inline">{children}</span>,
          ul: ({ children }) => <span className="inline-block pl-4">{children}</span>,
          ol: ({ children }) => <span className="inline-block pl-4">{children}</span>,
          li: ({ children }) => <span className="inline">{children}</span>,
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </span>
  );
}
