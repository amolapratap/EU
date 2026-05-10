// "use client";

// import { approvePaper } from "../services/missingPaperApi";
// import { MissingPaper } from "../types/missing-paper";

// interface Props {
//   paper: MissingPaper | null;
//   open: boolean;
//   onClose: () => void;
// }

// export default function ApproveDialog({
//   paper,
//   open,
//   onClose,
// }: Props) {
//   if (!open || !paper) return null;

//   const handleApprove = async () => {
//     await approvePaper(paper._id);

//     onClose();

//     window.location.reload();
//   };

//   return (
//     <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5">
//         <h2 className="text-2xl font-bold">
//           Approve Paper?
//         </h2>

//         <p className="text-muted-foreground">
//           This will process branding and publish the paper.
//         </p>

//         <div className="flex justify-end gap-3">
//           <button
//             onClick={onClose}
//             className="border px-5 py-3 rounded-xl"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleApprove}
//             className="bg-green-600 text-white px-5 py-3 rounded-xl"
//           >
//             Approve
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }




"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";

import { approvePaper } from "../services/missingPaperApi";
import { MissingPaper } from "../types/missing-paper";

interface Props {
  paper: MissingPaper | null;
  open: boolean;
  onClose: () => void;
}

export default function ApproveDialog({
  paper,
  open,
  onClose,
}: Props) {

  const [loading, setLoading] = useState(false);

  if (!open || !paper) return null;

  const handleApprove = async () => {

    try {

      setLoading(true);

      const res = await approvePaper(
        paper._id
      );

      toast.success(
        res.message ||
          "Paper approved successfully",
        {
          duration: 5000,
        }
      );

      onClose();

      window.location.reload();
      // onSuccess();

    } catch (err: any) {

      toast.error(
        err.message ||
          "Failed to approve paper",
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
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">

      {/* DRAWER */}
      <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER */}
        <div className="border-b px-6 py-5 flex items-start justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="h-11 w-11 rounded-2xl bg-green-100 flex items-center justify-center">

                <CheckCircle2
                  className="text-green-600"
                  size={22}
                />

              </div>

              <div>

                <h2 className="text-2xl font-bold text-gray-900">
                  Approve Paper
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  This uploaded paper will be
                  branded and published publicly.
                </p>

              </div>

            </div>

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

          {/* PAPER INFO */}
          <div className="border rounded-2xl p-5 bg-gray-50 space-y-4">

            <div>

              <span className="text-sm text-gray-500">
                Subject
              </span>

              <p className="font-semibold text-lg">
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

              <div>

                <span className="text-gray-500">
                  Exam Type
                </span>

                <p className="font-medium">
                  {paper.exam_type}
                </p>

              </div>

              <div>

                <span className="text-gray-500">
                  Paper Type
                </span>

                <p className="font-medium capitalize">
                  {paper.paper_type}
                </p>

              </div>

            </div>

          </div>

          {/* INFO */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">

            <p className="text-sm text-green-800 leading-relaxed">
              Approving this paper will:
            </p>

            <ul className="mt-3 space-y-2 text-sm text-green-700 list-disc pl-5">

              <li>
                Process branding on uploaded PDF
              </li>

              <li>
                Upload final PDF to public storage
              </li>

              <li>
                Add paper to official papers collection
              </li>

              <li>
                Mark this upload as approved
              </li>

            </ul>

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
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl disabled:opacity-60 transition font-medium"
          >
            {loading
              ? "Approving..."
              : "Approve & Publish"}
          </button>

        </div>

      </div>

    </div>
  );
}