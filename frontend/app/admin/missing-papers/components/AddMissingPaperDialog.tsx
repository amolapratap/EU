"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  X,
  FileText,
  Upload,
  Trash2,
  Eye,
} from "lucide-react";

import { BRANCHES, ALL_SEMESTERS } from "@/lib/constants/academic";

import { createMissingPaper } from "../services/missingPaperApi";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EXAM_TYPES = [
  "END-SEM",
  "MID-SEM",
  "NPTEL",
  "QUIZ",
  "PRACTICE",
];

const PAPER_TYPES = [
  "regular",
  "special",
  "complement",
];

export default function AddMissingPaperDialog({
  open,
  onOpenChange,
}: Props) {

  const [form, setForm] = useState<any>({
    exam_type: "END-SEM",
    paper_type: "regular",
  });

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (
        !form.name ||
        !form.subject_code ||
        !form.req_paper_code ||
        !form.semester_code ||
        !form.req_semester_code ||
        !form.branch_code ||
        !form.year
      ) {
        toast.error("Please fill all required fields");
        return;
      }

      const res = await createMissingPaper(form);

      toast.success(
        res.message || "Missing paper added successfully"
      );

      onOpenChange(false);

      window.location.reload();

    } catch (err: any) {

      toast.error(
        err.message || "Something went wrong"
      );

      console.error(err);

    } finally {
      setLoading(false);
    }
  };

  return (
    // <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
   <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">

      {/* <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden"> */}
      <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER */}
        {/* <div className="border-b px-6 py-5"> */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-start justify-between">
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Add Missing a Paper
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Create a missing paper entry for public contribution and review.
          </p>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          // className="h-100z w-10 rounded-x hover:bg-gray-100 transition flex items-center justify-center text-gray-500"
          className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0"
        >
          {/* ✕ */}
          <X size={20} />
        </button>

        </div>

        {/* BODY */}
        {/* <div className="p-6"> */}
        <div className="flex-1 overflow-y-auto p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Subject Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Subject Name
              </label>

              <input
                placeholder="Computer Networks"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>

             {/* Year */}
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Year
              </label>

              <input
                placeholder="2024"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    year: e.target.value,
                  })
                }
              />
            </div>

            {/* Subject Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Subject Code
              </label>

              <input
                placeholder="100501"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    subject_code: e.target.value,
                  })
                }
              />
            </div>

            {/* Required Paper Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Required Paper Code
              </label>

              <input
                placeholder="100501-2023-END"
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    req_paper_code: e.target.value,
                  })
                }
              />
            </div>

           

            {/* Semester */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Semester
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 bg-white"
                value={form.semester_code || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    semester_code: e.target.value,
                  })
                }
              >
                <option value="">
                  Select Semester
                </option>

                {ALL_SEMESTERS.map((sem) => (
                  <option
                    key={sem.code}
                    value={sem.code}
                  >
                    {sem.name}
                  </option>
                ))}
              </select>
            </div>
            {/* reqquired Semester */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Required Semester
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 bg-white"
                value={form.req_semester_code || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    req_semester_code: e.target.value,
                  })
                }
              >
                <option value="">
                  Select Semester
                </option>

                {ALL_SEMESTERS.map((sem) => (
                  <option
                    key={sem.code}
                    value={sem.code}
                  >
                    {sem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Branch
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 bg-white"
                value={form.branch_code || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    branch_code: e.target.value,
                  })
                }
              >
                <option value="">
                  Select Branch
                </option>

                {BRANCHES.map((branch) => (
                  <option
                    key={branch.code}
                    value={branch.code}
                  >
                    {branch.short_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Exam Type
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 bg-white"
                value={form.exam_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    exam_type: e.target.value,
                  })
                }
              >
                {EXAM_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Paper Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Paper Type
              </label>

              <select
                className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 bg-white"
                value={form.paper_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paper_type: e.target.value,
                  })
                }
              >
                {PAPER_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* FOOTER */}
        {/* <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50"> */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white sticky bottom-0">

          <button
            onClick={() => onOpenChange(false)}
            className="border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded-xl disabled:opacity-60 hover:opacity-90 transition font-medium"
          >
            {loading
              ? "Adding..."
              : "Add Missing Paper"}
          </button>

        </div>

      </div>

    </div>
  );

}