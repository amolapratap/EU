"use client";

import React, { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { handleShare } from "@/components/handleShare/handleShare";
import { toast } from "sonner";

interface BlogShareBarProps {
  title: string;
}

export default function BlogShareBar({ title }: BlogShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    await handleShare({
      title,
      text: `${title} - Read latest update on Alpha Result`,
    });
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Article link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        title="Share"
      >
        <Share2 className="w-3.5 h-3.5 text-indigo-600" />
        Share
      </button>

      <button
        type="button"
        onClick={onCopyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        title="Copy Link"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            Copy Link
          </>
        )}
      </button>
    </div>
  );
}
