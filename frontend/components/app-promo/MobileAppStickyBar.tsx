"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X, Sparkles } from "lucide-react";
import { GooglePlayIcon, PLAY_STORE_URL } from "./GooglePlayButton";

export default function MobileAppStickyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("alpharesult_sticky_app_dismissed");
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem("alpharesult_sticky_app_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Install Alpha Result App"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 text-white backdrop-blur-lg border-t border-indigo-900/60 shadow-[0_-8px_25px_rgba(0,0,0,0.35)] px-3 py-2.5 transition-all duration-300 animate-slide-up"
    >
      <div className="flex items-center justify-between gap-2.5 max-w-lg mx-auto">
        {/* App Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow border border-white/40">
            <Image
              src="/alpha_result_logo.png"
              alt="Alpha Result"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-white truncate">
                Alpha Result App
              </p>
              <span className="text-[9px] bg-emerald-500 text-white font-extrabold uppercase px-1 py-0.2 rounded">
                Free
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              Better experience & offline features
            </p>
          </div>
        </div>

        {/* CTA & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold shadow-md transition"
          >
            <GooglePlayIcon className="w-3.5 h-3.5" />
            <span>Install</span>
          </a>

          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
