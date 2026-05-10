"use client";

import { MissingPaper } from "../types/missing-paper";

interface Props {
  paper: MissingPaper | null;
  open: boolean;
  onClose: () => void;
}

export default function PDFPreviewDrawer({
  paper,
  open,
  onClose,
}: Props) {
  if (!open || !paper) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-3xl bg-white h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">
            PDF Preview
          </h2>

          <button
            onClick={onClose}
            className="border px-4 py-2 rounded-xl"
          >
            Close
          </button>
        </div>

        <iframe
          src={paper.temp_pdf_url}
          className="w-full h-[90vh] rounded-2xl border"
        />
      </div>
    </div>
  );
}