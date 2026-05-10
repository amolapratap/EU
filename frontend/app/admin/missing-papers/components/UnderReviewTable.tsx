"use client";

import { useState } from "react";
import { MissingPaper } from "../types/missing-paper";

import StatusBadge from "./StatusBadge";
import ApproveDialog from "./ApproveDialog";
import RejectDialog from "./RejectDialog";
import PDFPreviewDrawer from "./PDFPreviewDrawer";

interface Props {
  data: MissingPaper[];
}

export default function UnderReviewTable({ data }: Props) {
  const [approvePaper, setApprovePaper] = useState<MissingPaper | null>(null);
  const [rejectPaper, setRejectPaper] = useState<MissingPaper | null>(null);
  const [previewPaper, setPreviewPaper] = useState<MissingPaper | null>(null);

  if (!data.length) {
    return (
      <div className="border rounded-2xl p-10 text-center text-muted-foreground bg-white">
        No papers under review.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-4">Subject</th>
              <th className="p-4">Uploader</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((paper) => (
              <tr key={paper._id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{paper.subject_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {paper.name}
                    </p>
                  </div>
                </td>

                <td className="p-4">
                  {paper.uploader_name || "Anonymous"}
                </td>

                <td className="p-4">
                  <StatusBadge status={paper.status} />
                </td>

                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setPreviewPaper(paper)}
                      className="border px-4 py-2 rounded-lg hover:bg-gray-100"
                    >
                      Preview
                    </button>

                    <button
                      onClick={() => setApprovePaper(paper)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => setRejectPaper(paper)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ApproveDialog
        paper={approvePaper}
        open={!!approvePaper}
        onClose={() => setApprovePaper(null)}
      />

      <RejectDialog
        paper={rejectPaper}
        open={!!rejectPaper}
        onClose={() => setRejectPaper(null)}
      />

      <PDFPreviewDrawer
        paper={previewPaper}
        open={!!previewPaper}
        onClose={() => setPreviewPaper(null)}
      />
    </>
  );
}