"use client";

import { useState } from "react";

import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import {
  X,
  FileText,
  Upload,
  Trash2,
  Eye,
} from "lucide-react";

import { uploadPublicPaper } from "../services/missingPaperApi";

import {
    BRANCHES,
  } from "@/lib/constants/academic";

interface Props {
  open: boolean;
  onClose: () => void;
  paper: any;
  onSuccess: () => void;
}

export default function UploadPaperDrawer({
  open,
  onClose,
  paper,
  onSuccess,
}: Props) {

  const [uploaderName, setUploaderName] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const previewUrl = file
    ? URL.createObjectURL(file)
    : null;




    const onDrop = (acceptedFiles: File[]) => {

        const selected = acceptedFiles[0];
      
        if (!selected) return;
      
        if (
          selected.type !==
          "application/pdf"
        ) {
          toast.error(
            "Only PDF files are allowed"
          );
      
          return;
        }
      
        setFile(selected);
      };
      
    const{
        getRootProps,
        getInputProps,
        isDragActive,
      } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
          "application/pdf": [".pdf"],
        },
      });
    


  if (!open || !paper) return null;

  const handleUpload = async () => {

    try {

      if (!file) {
        toast.error(
          "Please select a PDF file"
        );

        return;
      }

      setLoading(true);

      const res = await uploadPublicPaper(
        paper._id,
        file,
        uploaderName
      );

      toast.success(
        uploaderName
          ? `Thank you ${uploaderName} for contributing ❤️`
          : "Thank you for contributing ❤️",
        {
          duration: 5000,
        }
      );

      setFile(null);

      onClose();

      onSuccess();

    } catch (err: any) {

      toast.error(
        err.message || "Upload failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">

      <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER */}
        <div className="border-b px-6 py-5 flex items-start justify-between shrink-0">

          <div>

            <h2 className="text-2xl font-bold text-gray-900">
              Upload Question Paper
            </h2>

            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Your contribution helps thousands of students prepare better.
              Uploaded papers are reviewed manually before approval.
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0"
          >
            <X size={20} />
          </button>

        </div>


        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">


          {/* PAPER INFO */}
                <div className="relative bg-gradient-to-br from-gray-50 to-white border rounded-3xl p-5 space-y-4 overflow-hidden">

                {/* TOP RIGHT */}
                <div className="absolute top-5 right-5 flex flex-col items-end gap-2">

                <div className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">

                    Semester {paper.semester_code}

                </div>

                <div className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">

                    {
                    BRANCHES.find(
                        (b) =>
                        b.code === paper.branch_code
                    )?.short_name
                    }

                </div>

                </div>


                {/* TITLE */}
                <div className="pr-28">

                <h3 className="text-xl font-bold text-gray-900 leading-snug">

                    {paper.name}

                </h3>

                <p className="text-sm text-gray-500 mt-1 leading-relaxed">

                    Upload the correct PDF for this paper.

                </p>

                </div>


                {/* TAGS */}
                <div className="flex flex-wrap gap-2 text-sm">

                <span className="bg-white border rounded-full px-3 py-1.5 font-medium">

                    {paper.req_paper_code}

                </span>

                <span className="bg-white border rounded-full px-3 py-1.5 font-medium">

                    {paper.year}

                </span>

                <span className="bg-white border rounded-full px-3 py-1.5 font-medium">

                    {paper.exam_type}

                </span>

                <span className="bg-white border rounded-full px-3 py-1.5 font-medium capitalize">

                    {paper.paper_type}

                </span>

                </div>

                </div>


          {/* NAME */}
          <div className="space-y-2">

            <label className="text-sm font-semibold text-gray-700">
              Your Name (Optional)
            </label>

            <input
              value={uploaderName}
              onChange={(e) =>
                setUploaderName(e.target.value)
              }
              placeholder="Rahul Kumar"
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/10 transition"
            />

            <p className="text-xs text-gray-500">
              Your name may appear in contribution credits after approval.
            </p>

          </div>


          {/* FILE */}
          <div className="space-y-4">

            <div className="flex items-center justify-between">

              <label className="text-sm font-semibold text-gray-700">
                Upload PDF
              </label>

              <span className="text-xs text-gray-400">
                Max 10MB
              </span>

            </div>

            {/* UPLOAD BOX */}
            {!file && (

             
<div
{...getRootProps()}
className={`
  border-2 border-dashed rounded-3xl p-8
  flex flex-col items-center justify-center
  text-center cursor-pointer transition
  ${
    isDragActive
      ? "border-black bg-black/5"
      : "border-gray-200 bg-gray-50/60 hover:border-black/20"
  }
`}
>

<input {...getInputProps()} />

<div className="h-16 w-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">

  <Upload
    size={28}
    className="text-gray-700"
  />

</div>

<h3 className="font-semibold text-lg text-gray-900">

  {isDragActive
    ? "Drop PDF here"
    : "Upload Question Paper"}

</h3>

<p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">

  {isDragActive
    ? "Release to upload your PDF"
    : "Drag & drop your PDF here or click to browse"}

</p>

<div className="mt-5 bg-black text-white px-5 py-2.5 rounded-2xl text-sm font-medium">
  Choose PDF File
</div>

</div>

            )}


            {/* FILE PREVIEW */}
            {file && (

              <div className="space-y-4">

                {/* FILE CARD */}
                <div className="border rounded-3xl overflow-hidden bg-white">

                  <div className="p-5 flex items-start gap-4">

                    <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">

                      <FileText
                        size={26}
                        className="text-red-600"
                      />

                    </div>

                    <div className="flex-1 min-w-0">

                      <h3 className="font-semibold text-gray-900 break-all line-clamp-2">
                        {file.name}
                      </h3>

                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">

                        <span>
                          {(file.size / 1024 / 1024).toFixed(
                            2
                          )}{" "}
                          MB
                        </span>

                        <span>•</span>

                        <span>PDF Document</span>

                      </div>

                    </div>

                    <button
                      onClick={() => setFile(null)}
                      className="h-11 w-11 rounded-2xl hover:bg-red-50 transition flex items-center justify-center"
                    >
                      <Trash2
                        size={20}
                        className="text-red-600"
                      />
                    </button>

                  </div>


                  {/* PDF PREVIEW */}
                  {previewUrl && (

                    <div className="border-t bg-gray-100 p-3">

                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">

                        <Eye size={16} />

                        PDF Preview

                      </div>

                      <div className="rounded-2xl overflow-hidden border bg-white h-[420px]">

                        <iframe
                          src={previewUrl}
                          className="w-full h-full"
                        />

                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>


          {/* INFO */}
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800 leading-relaxed">

            <div className="font-semibold mb-2">
              Before Uploading
            </div>

            <ul className="space-y-1.5 list-disc ml-5">

              <li>
                Upload only clear and readable PDFs
              </li>

              <li>
                Ensure the subject and year match correctly
              </li>

              <li>
                Blurry or incorrect uploads may be rejected
              </li>

              <li>
                Only PDF format is accepted
              </li>

            </ul>

          </div>

        </div>


        {/* FOOTER */}
        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-white shrink-0">

          <button
            onClick={onClose}
            className="border px-5 py-3 rounded-2xl hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded-2xl disabled:opacity-60 hover:opacity-90 transition font-medium"
          >
            {loading
              ? "Uploading..."
              : "Upload PDF"}
          </button>

        </div>

      </div>

    </div>
  );
}
