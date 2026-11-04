"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Smartphone,
  Zap,
  Bell,
  ShieldCheck,
  ExternalLink,
  QrCode,
  ArrowRight,
  CheckCircle2,
  X,
  BookOpen,
} from "lucide-react";
import GooglePlayButton from "@/components/app-promo/GooglePlayButton";
import AppDownloadModal from "@/components/app-promo/AppDownloadModal";
import { track } from "@vercel/analytics";

const OFFICIAL_BEU_RESULT_URL = "https://beu-bih.ac.in/result-one";

function ResultRedirectContent() {
  const searchParams = useSearchParams();

  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [showModal, setShowModal] = useState(false);
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState<number | null>(null);
  const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

  // Extract any parameters passed in URL (e.g. from /result/new or bookmark)
  const regNo = (
    searchParams.get("regNo") ||
    searchParams.get("reg_no") ||
    searchParams.get("redg_no") ||
    searchParams.get("roll") ||
    ""
  ).trim();

  const semester = (searchParams.get("semester") || searchParams.get("sem") || "").trim();
  const examHeld = (searchParams.get("examHeld") || searchParams.get("exam_held") || "").trim();
  const utmSource = searchParams.get("utm_source") || "website";
  const utmCampaign = searchParams.get("utm_campaign") || "result_section";

  // Build Play Store referrer and Intent URLs
  const { playStoreUrl, androidIntentUrl, qrCodeUrl } = useMemo(() => {
    const queryParts: string[] = [
      `utm_source=${encodeURIComponent(utmSource)}`,
      `utm_medium=result_page`,
      `utm_campaign=${encodeURIComponent(utmCampaign)}`,
      `target=result`,
      `section=result`,
    ];

    if (regNo) queryParts.push(`regNo=${encodeURIComponent(regNo)}`);
    if (semester) queryParts.push(`semester=${encodeURIComponent(semester)}`);
    if (examHeld) queryParts.push(`examHeld=${encodeURIComponent(examHeld)}`);

    const referrer = queryParts.join("&");
    const playStore = `https://play.google.com/store/apps/details?id=in.alpharesult.app&referrer=${encodeURIComponent(
      referrer
    )}`;

    const intentPath = regNo
      ? `result?regNo=${encodeURIComponent(regNo)}`
      : `result`;

    const intent = `intent://alpharesult.in/${intentPath}#Intent;scheme=https;package=in.alpharesult.app;S.browser_fallback_url=${encodeURIComponent(
      playStore
    )};end`;

    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      playStore
    )}`;

    return {
      playStoreUrl: playStore,
      androidIntentUrl: intent,
      qrCodeUrl: qr,
    };
  }, [utmSource, utmCampaign, regNo, semester, examHeld]);

  // Detect platform on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    let detected: "android" | "ios" | "desktop" = "desktop";
    if (/android/i.test(ua)) {
      detected = "android";
    } else if (
      /iPad|iPhone|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) {
      detected = "ios";
    }
    setPlatform(detected);

    try {
      track("result_page_visit", {
        platform: detected,
        has_reg_no: Boolean(regNo),
      });
    } catch {}

    // On Android: start brief auto-redirect countdown
    if (detected === "android") {
      setAutoRedirectCountdown(2);
    }
  }, [regNo]);

  // Handle Android auto-redirect countdown
  useEffect(() => {
    if (autoRedirectCountdown === null || autoRedirectCancelled) return;

    if (autoRedirectCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (autoRedirectCountdown === 0) {
      // Trigger redirect to app/Play Store
      try {
        track("result_auto_redirect_triggered", { platform: "android" });
      } catch {}
      window.location.href = androidIntentUrl;
    }
  }, [autoRedirectCountdown, autoRedirectCancelled, androidIntentUrl]);

  // Desktop return listener: show promo modal when user returns from Play Store tab
  useEffect(() => {
    const handleReturn = () => {
      try {
        const pending = sessionStorage.getItem("pending_desktop_result_promo");
        if (pending) {
          sessionStorage.removeItem("pending_desktop_result_promo");
          setShowModal(true);
        }
      } catch {}
    };

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        handleReturn();
      }
    };

    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const handleOpenApp = useCallback(() => {
    try {
      track("result_open_app_clicked", { platform });
    } catch {}

    if (platform === "android") {
      window.location.href = androidIntentUrl;
    } else if (platform === "desktop") {
      try {
        sessionStorage.setItem("pending_desktop_result_promo", "true");
      } catch {}
      window.open(playStoreUrl, "_blank", "noopener,noreferrer");
    } else {
      window.open(playStoreUrl, "_blank", "noopener,noreferrer");
    }
  }, [platform, androidIntentUrl, playStoreUrl]);

  const handleCancelAutoRedirect = () => {
    setAutoRedirectCancelled(true);
    setAutoRedirectCountdown(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/30 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Android Auto-Redirect Notice */}
        {platform === "android" && autoRedirectCountdown !== null && !autoRedirectCancelled && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-4 shadow-lg flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  Opening Alpha Result App in {autoRedirectCountdown}s...
                </p>
                <p className="text-xs text-indigo-200 truncate">
                  Redirecting to the Result section in the app
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenApp}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 rounded-lg text-slate-950 transition"
              >
                Open Now
              </button>
              <button
                onClick={handleCancelAutoRedirect}
                className="p-1.5 text-xs text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition"
                title="Cancel redirect and stay on page"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-xl">
          {/* Top Banner Gradient */}
          <div className="relative bg-gradient-to-br from-[#5B2EBD] via-[#6D3FD3] to-[#8C52FF] p-6 sm:p-8 text-white text-center pb-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md border border-emerald-300/30 text-xs font-bold uppercase tracking-wider text-emerald-200 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Live on Alpha Result App
            </div>

            {/* App Icon */}
            <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-white/80 mb-4">
              <Image
                src="/alpha_result_logo.png"
                alt="Alpha Result App"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Check BEU Semester Results
            </h1>
            <p className="mt-2 text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
              Fast, 1-tap BEU result lookup using your registration number without server crashes or CAPTCHA delays — now available in the official Alpha Result App.
            </p>

            {/* If regNo was passed from previous screen */}
            {regNo && (
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Registration No: <strong className="text-white font-bold">{regNo}</strong> (ready in app)</span>
              </div>
            )}
          </div>

          {/* Body Section */}
          <div className="p-6 sm:p-8 space-y-6">

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleOpenApp}
                className="w-full sm:w-auto min-w-[260px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#5B2EBD] hover:bg-[#4d23a8] active:scale-98 text-white font-bold text-base shadow-lg shadow-purple-500/25 transition-all"
              >
                <Smartphone className="w-5 h-5 text-emerald-300" />
                <span>Check Result in App</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <GooglePlayButton
                size="md"
                theme="dark"
                href={playStoreUrl}
                onClick={() => {
                  try {
                    track("result_google_play_button_clicked", { platform });
                  } catch {}
                  if (platform === "desktop") {
                    try {
                      sessionStorage.setItem("pending_desktop_result_promo", "true");
                    } catch {}
                  }
                }}
                className="w-full sm:w-auto justify-center"
              />
            </div>

            {/* Key Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">1-Tap Instant Result</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Check marks instantly via registration number with zero server crashes.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Result Release Alerts</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Get notified immediately on your phone when new BEU results are published.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Marksheet & History</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Save marks, calculate SGPA, and compare grades across semesters.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">100% Free for BEU</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Lightweight (&lt;20 MB) app built specifically for Bihar Engineering students.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop QR Code Card (shown on PC/Laptop) */}
            {platform === "desktop" && (
              <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-white shrink-0 shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="Scan to open Alpha Result App"
                      width={120}
                      height={120}
                      className="w-24 h-24 sm:w-28 sm:h-28"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan with Phone Camera</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Get the Result Section on your Phone
                    </h3>
                    <p className="text-xs text-indigo-200 max-w-sm leading-relaxed">
                      Point your phone camera at the QR code to open Google Play Store and install the Alpha Result App directly.
                    </p>
                  </div>
                </div>

                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("pending_desktop_result_promo", "true");
                    } catch {}
                  }}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <span>Open in Play Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* iOS Fallback Notice */}
            {platform === "ios" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm text-blue-900 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-950">
                    iPhone / iPad Users Note:
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    The Alpha Result App is currently built for Android. iOS users can view results on the official BEU portal below.
                  </p>
                </div>
              </div>
            )}

            {/* Fallback to Official BEU Website */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Need to check directly on the university website?
              </span>
              <a
                href={OFFICIAL_BEU_RESULT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                <span>Open Official BEU Result Portal</span>
                <ExternalLink size={13} />
              </a>
            </div>

          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs sm:text-sm font-medium text-slate-500 hover:text-[#5B2EBD] transition"
          >
            ← Back to Alpha Result Home
          </Link>
        </div>

      </div>

      {/* Promo Modal (opens when returning from Play Store or manually) */}
      <AppDownloadModal
        forceOpen={showModal}
        onClose={() => setShowModal(false)}
        customBadge="Instant BEU Result"
        customTitle="Check Result on Alpha Result App"
        customSubtitle="Enter your registration number once to get your grade card and instant notification for all future semesters!"
      />
    </main>
  );
}

export default function ResultRedirectView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultRedirectContent />
    </Suspense>
  );
}
