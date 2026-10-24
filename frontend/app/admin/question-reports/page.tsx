"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToReports() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/reports");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
      Redirecting to Reports...
    </div>
  );
}
