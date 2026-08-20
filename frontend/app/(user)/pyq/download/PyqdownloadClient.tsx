"use client";

import AcademicSelector from "@/components/academic/AcademicSelector";
import { useAcademicSelection } from "@/lib/hooks/useAcademicSelection";
import McqTestPromoBanner from "@/components/test/McqTestPromoBanner";


export default function PYQDOWNLOADRoot() {
  const state = useAcademicSelection("/pyq/download");

  return (
    <div className="space-y-4">
      <div className="max-w-1xl mx-auto px-3 pt-6">
        <McqTestPromoBanner variant="compact" />
      </div>
      <AcademicSelector
        {...state}
        title="Download PYQs"
      />
    </div>
  );
}