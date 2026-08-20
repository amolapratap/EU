import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import TestExamClient from "./TestExamClient";

type PageProps = {
  params: { paper_id: string };
};

export default function TestPaperPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1a365d] animate-spin" />
          <p className="text-sm text-slate-600">Preparing test environment...</p>
        </div>
      }
    >
      <TestExamClient paperId={params.paper_id} />
    </Suspense>
  );
}
