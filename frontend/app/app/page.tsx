"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { track } from "@vercel/analytics";
import GooglePlayButton from "@/components/app-promo/GooglePlayButton";

function AppRedirectContent() {
  const searchParams = useSearchParams();

  const { source, campaign, playStoreUrl } = useMemo(() => {
    const src =
      searchParams.get("s") ||
      searchParams.get("utm_source") ||
      "alpharesult_link";
    const cmp =
      searchParams.get("c") ||
      searchParams.get("utm_campaign") ||
      "promo_2026";

    const referrer = encodeURIComponent(
      `utm_source=${src}&utm_medium=referral&utm_campaign=${cmp}`
    );

    return {
      source: src,
      campaign: cmp,
      playStoreUrl: `https://play.google.com/store/apps/details?id=in.alpharesult.app&referrer=${referrer}`,
    };
  }, [searchParams]);

  useEffect(() => {
    try {
      // Track in Vercel Web Analytics
      track("app_link_visit", { source, campaign });

      // Track in Google Analytics (if loaded)
      if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
        (window as any).gtag("event", "app_link_visit", {
          utm_source: source,
          utm_campaign: campaign,
        });
      }
    } catch {
      // ignore tracking errors
    }

    // Small delay (180ms) ensures Vercel Analytics & GA beacons fire before redirecting to Play Store
    const timer = setTimeout(() => {
      window.location.replace(playStoreUrl);
    }, 180);

    return () => clearTimeout(timer);
  }, [playStoreUrl, source, campaign]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-indigo-100 p-8 text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg border border-indigo-100">
          <Image
            src="/alpha_result_logo.png"
            alt="Alpha Result App"
            width={80}
            height={80}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            Opening Google Play Store...
          </h1>
          <p className="text-xs text-slate-500">
            Redirecting you to install the official <strong>Alpha Result</strong> Android App.
          </p>
        </div>

        <div className="flex justify-center py-2">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>

        <div className="pt-2">
          <a
            href={playStoreUrl}
            className="inline-block w-full"
          >
            <GooglePlayButton size="lg" className="w-full justify-center shadow-md pointer-events-none" />
          </a>
          <p className="text-[11px] text-slate-400 mt-2">
            If you are not redirected automatically, tap the button above.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AppRedirectContent />
    </Suspense>
  );
}
