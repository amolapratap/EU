"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { rejectPaper } from "../services/missingPaperApi";
import { MissingPaper } from "../types/missing-paper";
import { getMissingPapers } from "../services/missingPaperApi";


interface Props {
  paper: MissingPaper | null;
  open: boolean;
  onClose: () => void;
}

export default function RejectDialog({
  paper,
  open,
  onClose,
}: Props) {

  const [reason, setReason] = useState(
    "Wrong Question paper"
  );  
  const [loading, setLoading] = useState(false);

  if (!open || !paper) return null;

  const handleReject = async () => {

    try {

      if (!reason.trim()) {
        toast.error(
          "Please provide a rejection reason",
          {
            duration: 5000,
          }
        );

        return;
      }

      setLoading(true);

      const res = await rejectPaper(
        paper._id,
        reason
      );

      onClose();

      toast.success(
        res.message ||
          "Paper rejected successfully",
        {
          duration: 5000,
        }
      );

      // getMissingPapers();
      // onSuccess();
      window.location.reload();

    } catch (err: any) {

      toast.error(
        err.message ||
          "Failed to reject paper",
        {
          duration: 6000,
        }
      );

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  return (
    // <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">

      {/* DRAWER */}
      <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER */}
        <div className="border-b px-6 py-5 flex items-start justify-between">

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Reject Paper
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              This uploaded paper will be marked
              as rejected and hidden from review
              queue.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>

        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* INFO CARD */}
          <div className="border rounded-2xl p-4 bg-gray-50 space-y-2">

            <div>
              <span className="text-sm text-gray-500">
                Subject
              </span>

              <p className="font-semibold">
                {paper.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">

              <div>
                <span className="text-gray-500">
                  Subject Code
                </span>

                <p className="font-medium">
                  {paper.subject_code}
                </p>
              </div>

              <div>
                <span className="text-gray-500">
                  Year
                </span>

                <p className="font-medium">
                  {paper.year}
                </p>
              </div>

            </div>

          </div>

          {/* REASON */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-gray-700">
              Rejection Reason
            </label>

            <textarea
              placeholder="Example: Wrong subject uploaded, blurry pages, incomplete PDF, duplicate upload..."
              className="w-full border rounded-2xl p-4 min-h-[180px] outline-none focus:ring-2 focus:ring-red-100"
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
            />

            <p className="text-xs text-gray-500">
              This reason may be shown later for
              re-upload guidance.
            </p>

          </div>

        </div>

        {/* FOOTER */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white sticky bottom-0">

          <button
            onClick={onClose}
            className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleReject}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl disabled:opacity-60 transition font-medium"
          >
            {loading
              ? "Rejecting..."
              : "Reject Paper"}
          </button>

        </div>

      </div>

    </div>
  );
}