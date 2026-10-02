"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, Sparkles, Zap, DownloadCloud, Bell, ShieldCheck } from "lucide-react";
import GooglePlayButton, { PLAY_STORE_URL } from "./GooglePlayButton";

type AppDownloadModalProps = {
  autoPop?: boolean;
  delayMs?: number;
  sessionKey?: string;
  forceOpen?: boolean;
  onClose?: () => void;
};

export default function AppDownloadModal({
  autoPop = true,
  delayMs = 2200,
  sessionKey = "alpharesult_app_modal_dismissed",
  forceOpen,
  onClose,
}: AppDownloadModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return;
    }

    if (!autoPop) return;

    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem(sessionKey);
      if (dismissed) return;
    } catch {
      // ignore storage errors
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [autoPop, delayMs, sessionKey, forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(sessionKey, "true");
    } catch {
      // ignore
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-indigo-100 transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gradient Header */}
        <div className="relative bg-gradient-to-br from-[#5B2EBD] via-[#6D3FD3] to-[#8C52FF] p-6 text-white text-center pb-8 overflow-hidden">
          {/* Subtle background circles */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/4" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Release Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] font-semibold tracking-wide uppercase text-indigo-100 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Official App Released!
          </div>

          {/* App Icon + Title */}
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/60 mb-2.5 border-2 border-white/90">
              <Image
                src="/alpha_result_logo.png"
                alt="Alpha Result App"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Alpha Result Android App
            </h3>
            <p className="text-xs text-indigo-100 mt-1 max-w-xs">
              Install now for faster PYQ downloads, offline view, and instant exam alerts!
            </p>
          </div>
        </div>

        {/* Modal Body with Features */}
        <div className="p-6 pt-5 bg-white space-y-4">
          <div className="grid grid-cols-2 gap-2.5 text-left">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800">1-Tap Downloads</p>
                <p className="text-[11px] text-slate-500">Fast & direct PDF access</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <DownloadCloud className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Offline View</p>
                <p className="text-[11px] text-slate-500">Read papers without data</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Exam Alerts</p>
                <p className="text-[11px] text-slate-500">Instant BEU updates</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-800">100% Free</p>
                <p className="text-[11px] text-slate-500">No ads or paywalls</p>
              </div>
            </div>
          </div>

          {/* Primary Action: Google Play Button */}
          <div className="pt-2 text-center flex flex-col items-center">
            <GooglePlayButton size="lg" className="w-full justify-center shadow-lg" />
            <span className="text-[11px] text-slate-400 mt-2 font-medium">
              Requires Android 6.0+ • Free on Google Play Store
            </span>
          </div>

          {/* Dismiss Action */}
          <div className="pt-1 border-t border-slate-100 text-center">
            <button
              onClick={handleClose}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition py-1"
            >
              Continue on website for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
