"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface OptionMathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders multiple-choice question options with full dynamic LaTeX mathematics and Markdown support.
 * Converts formulas like $45^\circ$, $G(s) = \frac{s+4}{s+1}$, or $\pm \sqrt{2}$ into crisp KaTeX math.
 */
export default function OptionMathText({ text, className = "" }: OptionMathTextProps) {
  if (!text) return null;

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
        {text}
      </ReactMarkdown>
    </span>
  );
}
