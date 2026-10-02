"use client";

import AcademicSelector from "@/components/academic/AcademicSelector";
import { useAcademicSelection } from "@/lib/hooks/useAcademicSelection";
import AppPromoBanner from "@/components/app-promo/AppPromoBanner";

export default function ClientCGPA() {
  const state = useAcademicSelection("/cgpa");

  return (
    <div className="space-y-4">
      <div className="max-w-1xl mx-auto px-3 pt-6">
        <AppPromoBanner context="cgpa" variant="compact" />
      </div>
      <AcademicSelector
        {...state}
        title="Select Branch & Semester for CGPA"
      />
    </div>
  );
}