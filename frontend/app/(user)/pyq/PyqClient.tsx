"use client";

import AcademicSelector from "@/components/academic/AcademicSelector";
import { useAcademicSelection } from "@/lib/hooks/useAcademicSelection";
import McqTestPromoBanner from "@/components/test/McqTestPromoBanner";
import AppDownloadModal from "@/components/app-promo/AppDownloadModal";
import AppPromoBanner from "@/components/app-promo/AppPromoBanner";

export default function PYQRoot() {
  const state = useAcademicSelection("/pyq");

  return (
    <div className="space-y-4">
      {/* Auto Pop-up for Alpha Result App */}
      <AppDownloadModal autoPop={true} delayMs={2000} />

      <div className="max-w-1xl mx-auto px-3 pt-6 space-y-3">
        <AppPromoBanner context="pyq-solution" variant="compact" />
        <McqTestPromoBanner variant="compact" />
      </div>
      <AcademicSelector
        {...state}
        title="Select Branch & Semester for PYQs"
      />
    </div>
  );
}
