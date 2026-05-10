// "use client";

// import { deletePaper } from "../services/missingPaperApi";
// import { MissingPaper } from "../types/missing-paper";

// interface Props {
//   paper: MissingPaper | null;
//   open: boolean;
//   onClose: () => void;
// }

// export default function DeleteDialog({
//   paper,
//   open,
//   onClose,
// }: Props) {
//   if (!open || !paper) return null;

//   const handleDelete = async () => {
//     await deletePaper(paper._id);

//     onClose();

//     window.location.reload();
//   };

//   return (
//     <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5">
//         <h2 className="text-2xl font-bold text-red-600">
//           Delete Paper?
//         </h2>

//         <p className="text-muted-foreground">
//           This action cannot be undone.
//         </p>

//         <div className="flex justify-end gap-3">
//           <button
//             onClick={onClose}
//             className="border px-5 py-3 rounded-xl"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleDelete}
//             className="bg-red-600 text-white px-5 py-3 rounded-xl"
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle, X } from "lucide-react";

import { deletePaper } from "../services/missingPaperApi";
import { MissingPaper } from "../types/missing-paper";

interface Props {
  paper: MissingPaper | null;
  open: boolean;
  onClose: () => void;
}

export default function DeleteDialog({
  paper,
  open,
  onClose,
}: Props) {

  const [loading, setLoading] = useState(false);

  if (!open || !paper) return null;

  const handleDelete = async () => {

    try {

      setLoading(true);

      const res = await deletePaper(
        paper._id
      );

      toast.success(
        res.message ||
          "Paper deleted successfully",
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
          "Failed to delete paper",
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

          <div className="flex items-center gap-3">

            <div className="h-11 w-11 rounded-2xl bg-red-100 flex items-center justify-center">

              <Trash2
                className="text-red-600"
                size={22}
              />

            </div>

            <div>

              <h2 className="text-2xl font-bold text-gray-900">
                Delete Paper
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Permanently remove this missing
                paper entry.
              </p>

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

          {/* WARNING */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex gap-3">

            <AlertTriangle
              className="text-red-600 shrink-0 mt-0.5"
              size={20}
            />

            <div>

              <p className="font-semibold text-red-800">
                This action cannot be undone
              </p>

              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                Once deleted, this missing paper
                entry and related temporary upload
                references may be permanently
                removed from the system.
              </p>

            </div>

          </div>

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
                  Status
                </span>

                <p className="font-medium capitalize">
                  {paper.status}
                </p>

              </div>

            </div>

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
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl disabled:opacity-60 transition font-medium"
          >
            {loading
              ? "Deleting..."
              : "Delete Permanently"}
          </button>

        </div>

      </div>

    </div>
  );
}