"use client";

import React from "react";
import Image from "next/image";
import {
  Sparkles,
  Download,
  Zap,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Target,
  BookOpen,
  CheckCircle2,
  Clock,
  Moon,
  Bell,
  BookCheck,
} from "lucide-react";
import GooglePlayButton, { PLAY_STORE_URL } from "./GooglePlayButton";

export type AppPromoContext =
  | "general"
  | "pyq-download"
  | "pyq-solution"
  | "cgpa"
  | "test"
  | "result";

type AppPromoBannerProps = {
  variant?: "card" | "compact" | "strip";
  context?: AppPromoContext;
  className?: string;
};

const CONTEXT_CONTENT: Record<
  AppPromoContext,
  {
    badge: string;
    title: string;
    subtitle: string;
    features: Array<{ icon: any; title: string; desc: string }>;
    chips: string[];
  }
> = {
  cgpa: {
    badge: "Smart GPA & Attendance",
    title: "Calculate SGPA + 75% Bunk Tracker in App",
    subtitle:
      "Accurate BEU credit grading, Target GPA predictor, and the 75% Safe Bunk Meter to know how many classes you can safely skip!",
    features: [
      { icon: ShieldCheck, title: "75% Safe Bunk Meter", desc: "Know exact classes to attend" },
      { icon: Target, title: "Target GPA Predictor", desc: "Predict your final semester grade" },
      { icon: BookCheck, title: "All Electives Supported", desc: "PE & OE credits included" },
    ],
    chips: ["🛡️ 75% Bunk Tracker", "🧮 BEU Credit System", "🔔 Timetable Reminders"],
  },
  "pyq-download": {
    badge: "Fast & Offline",
    title: "1-Tap PYQ Downloads & Offline Reading",
    subtitle:
      "Past 5+ Years BEU branch & semester solved papers with instant built-in PDF viewer and offline caching.",
    features: [
      { icon: Zap, title: "1-Tap Fast Downloads", desc: "No broken links or waiting" },
      { icon: Download, title: "Offline PDF Viewer", desc: "Read papers without data" },
      { icon: BookOpen, title: "V2 BEU Syllabus", desc: "Unit-wise recommended books" },
    ],
    chips: ["📄 Past 5+ Years Papers", "📴 Offline Cache", "⚡ <20 MB App"],
  },
  "pyq-solution": {
    badge: "Step-by-Step Solutions",
    title: "Subjective Solutions & Reveal-on-Tap MCQs",
    subtitle:
      "Detailed diagrams and steps for theory questions, plus interactive objective MCQ practice on the Android App.",
    features: [
      { icon: CheckCircle2, title: "Diagrams & Steps", desc: "Handcrafted university solutions" },
      { icon: Sparkles, title: "Reveal-on-Tap MCQs", desc: "Instant tap to test knowledge" },
      { icon: Moon, title: "Eye-Care Dark Theme", desc: "Comfortable late-night study" },
    ],
    chips: ["💡 Step-by-Step Answers", "🎯 Interactive MCQs", "🌙 Eye-Care Theme"],
  },
  test: {
    badge: "Computer Based Test",
    title: "Practice BEU Objective Papers in App",
    subtitle:
      "Simulate university exam hall conditions with timer, question palette navigation, instant score calculation, and review.",
    features: [
      { icon: Clock, title: "Timed CBT Tests", desc: "Real exam mode simulation" },
      { icon: Zap, title: "Instant Score & Review", desc: "Immediate correct answer reveal" },
      { icon: ShieldCheck, title: "Offline Practice", desc: "Attempt tests without network" },
    ],
    chips: ["⏱️ Timed CBT Interface", "📊 Instant Score Card", "🟢 100% Free"],
  },
  result: {
    badge: "Instant Lookup",
    title: "1-Tap BEU Result Checker & Alerts",
    subtitle:
      "Direct semester result lookup using your registration number without server crashes, plus instant result publication alerts.",
    features: [
      { icon: Zap, title: "1-Tap Result Lookup", desc: "Via registration number" },
      { icon: Bell, title: "Result Release Alerts", desc: "Never miss notification" },
      { icon: BookOpen, title: "Semester History", desc: "Save and compare marks" },
    ],
    chips: ["⚡ 1-Tap Result", "🔔 Instant Alerts", "📊 Free Forever"],
  },
  general: {
    badge: "Official BEU Student App",
    title: "The Ultimate All-in-One App for BEU Students",
    subtitle:
      "PYQs with step-by-step solutions, 75% attendance bunk tracker, SGPA calculator, and semester results — all in one free app.",
    features: [
      { icon: Download, title: "5+ Years Solved PYQs", desc: "Branch & sem-wise papers" },
      { icon: ShieldCheck, title: "75% Attendance Tracker", desc: "Safe bunk meter calculation" },
      { icon: Smartphone, title: "SGPA & Result Tools", desc: "With all new electives" },
    ],
    chips: ["🟢 100% Free", "📴 Works Offline", "⚡ Lightweight (<20 MB)"],
  },
};

export default function AppPromoBanner({
  variant = "card",
  context = "general",
  className = "",
}: AppPromoBannerProps) {
  const content = CONTEXT_CONTENT[context] || CONTEXT_CONTENT.general;

  if (variant === "compact") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-950 via-[#4d23a8] to-[#6d3ee8] text-white p-4 sm:p-5 shadow-lg ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/40">
              <Image
                src="/alpha_result_logo.png"
                alt="Alpha Result App"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight">
                  {content.title}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                  {content.badge}
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 mt-1 line-clamp-2 leading-relaxed">
                {content.subtitle}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {content.chips.map((chip, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/10 font-medium"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <GooglePlayButton size="sm" theme="light" className="shrink-0 self-end sm:self-center" />
        </div>
      </div>
    );
  }

  if (variant === "strip") {
    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/70 text-indigo-950 ${className}`}
      >
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <Smartphone className="w-4 h-4 text-[#5B2EBD] shrink-0" />
          <span>
            <strong className="text-indigo-900 font-semibold">{content.title}:</strong>{" "}
            <span className="text-slate-600">{content.subtitle}</span>
          </span>
        </div>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#5B2EBD] hover:bg-[#4d23a8] text-white text-xs font-semibold shadow-xs transition shrink-0 active:scale-95"
        >
          <span>Get Free App</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // Full Card Banner (for Homepage & spotlight sections)
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-indigo-200/50 bg-gradient-to-br from-[#160d38] via-[#2a1760] to-[#5B2EBD] text-white shadow-xl ${className}`}
    >
      {/* Decorative blurred background shapes */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/15 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            {content.badge}
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            {content.title}
          </h2>

          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            {content.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-indigo-100">
            {content.features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <Icon className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-[11px] text-indigo-200/80 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-indigo-200">
            <span className="font-medium text-white">Features:</span>
            {content.chips.map((chip, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-center gap-4 shrink-0 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border-2 border-white/60 shrink-0">
              <Image
                src="/alpha_result_logo.png"
                alt="Alpha Result Logo"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-base font-bold text-white">Alpha Result</p>
              <p className="text-xs text-indigo-200">Bihar Engineering University</p>
              <div className="flex items-center gap-1 text-[11px] text-amber-300 mt-0.5">
                <span>★ ★ ★ ★ ★</span>
                <span className="text-emerald-300 ml-1 font-semibold">100% Free</span>
              </div>
            </div>
          </div>

          <GooglePlayButton size="md" theme="dark" className="w-full justify-center shadow-lg" />

          <p className="text-[11px] text-indigo-300 text-center w-full">
            Available directly on Google Play Store
          </p>
        </div>
      </div>
    </section>
  );
}
