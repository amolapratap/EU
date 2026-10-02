import React from "react";

export function GooglePlayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M325.3 234.3L104.6 13l280.8 161.2-60.1 59.9z"
        fill="#00E676"
      />
      <path
        d="M47 38.3v435.5L265.8 256 47 38.3z"
        fill="#00A0FF"
      />
      <path
        d="M325.3 277.7l60.1 59.9L104.6 499l220.7-221.3z"
        fill="#FF3A44"
      />
      <path
        d="M449.6 232.7l-64.2-37.5-60.1 60.8 60.1 59.9 64.2-37.5c18.5-10.8 18.5-35 0-45.7z"
        fill="#FFC800"
      />
    </svg>
  );
}

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=in.alpharesult.app";

type GooglePlayButtonProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light" | "gradient";
  variant?: "dark" | "light" | "gradient";
};

export default function GooglePlayButton({
  className = "",
  size = "md",
  theme,
  variant,
}: GooglePlayButtonProps) {
  const activeTheme = theme || variant || "dark";
  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs rounded-lg gap-2",
    md: "px-5 py-2.5 text-sm rounded-xl gap-3",
    lg: "px-6 py-3 text-base rounded-2xl gap-3.5",
  }[size];

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-8 h-8",
  }[size];

  const themeClasses = {
    dark: "bg-slate-950 text-white hover:bg-slate-900 border border-slate-800 shadow-md",
    light: "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-md",
    gradient:
      "bg-gradient-to-r from-[#5B2EBD] to-[#7C4DFF] text-white hover:from-[#4e24a8] hover:to-[#6d3ee8] shadow-lg shadow-purple-500/25 border border-white/20",
  }[activeTheme];

  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${sizeClasses} ${themeClasses} ${className}`}
    >
      <GooglePlayIcon className={`${iconSizes} shrink-0`} />
      <div className="text-left leading-tight">
        <div
          className={`text-[9px] uppercase tracking-wider font-semibold ${
            theme === "light" ? "text-slate-500" : "text-slate-300"
          }`}
        >
          GET IT ON
        </div>
        <div className="font-bold font-sans tracking-wide leading-none mt-0.5">
          Google Play
        </div>
      </div>
    </a>
  );
}
