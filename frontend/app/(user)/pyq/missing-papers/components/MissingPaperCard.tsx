// interface Props {
//     paper: any;
//     type: "upload" | "review" | "approved";
//     onUpload?: (paper: any) => void;
//   }
  
//   export default function MissingPaperCard({
//     paper,
//     type,
//     onUpload,
//   }: Props) {
  
//     const contributor = paper.uploader_name
//       ? `Contributed by ${paper.uploader_name}`
//       : "Contributed by a Student";
  
  
//     return (
//       <div className="bg-white border rounded-3xl p-6 hover:shadow-lg transition-all duration-300 space-y-5">
  
//         <div className="space-y-2">
  
//           <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
//             {paper.name}
//           </h3>

  
//           <p className="text-sm text-gray-500 font-medium">
//             {paper.subject_code}
//           </p>
  
//         </div>
  
//         <div className="flex flex-wrap gap-2 text-sm">
  
//           <span className="bg-gray-100 rounded-full px-3 py-1 text-gray-700">
//             Semester {paper.semester_code}
//           </span>
  
//           <span className="bg-gray-100 rounded-full px-3 py-1 text-gray-700">
//             {paper.year}
//           </span>
  
//           <span className="bg-gray-100 rounded-full px-3 py-1 text-gray-700">
//             {paper.exam_type}
//           </span>

//           <span className="bg-gray-100 rounded-full px-3 py-1 text-gray-700">
//             {paper.paper_type} Exam
//           </span>
  
//         </div>
  
//         {type === "upload" && (
//           <button
//             onClick={() => onUpload?.(paper)}
//             className="w-full bg-black text-white py-3 rounded-2xl hover:opacity-90 transition font-medium"
//           >
//             Upload PDF
//           </button>
//         )}
  
//         {type === "review" && (
//           <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4">
//             <p className="text-yellow-700 font-medium">
//               Under Review
//             </p>
  
//             <p className="text-sm text-yellow-600 mt-1">
//               {contributor}
//             </p>
//           </div>
//         )}
  
//         {type === "approved" && (
//           <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
//             <p className="text-green-700 font-medium">
//               Approved Contribution
//             </p>
  
//             <p className="text-sm text-green-600 mt-1">
//               {contributor}
//             </p>
//           </div>
//         )}
  
//       </div>
//     );
//   }





import {
    CheckCircle2,
    Clock3,
    Upload,
  } from "lucide-react";
  
  import {
    ALL_BRANCHES,
  } from "@/lib/constants/academic";
  
  interface Props {
    paper: any;
    type: "upload" | "review" | "approved";
    onUpload?: (paper: any) => void;
  }
  
  export default function MissingPaperCard({
    paper,
    type,
    onUpload,
  }: Props) {
  
    const contributor = paper.uploader_name
      ? `Thanks to ${paper.uploader_name} for contributing`
      : "Contributed by a Student";
  
    const branch =
      ALL_BRANCHES.find(
        (b) => b.code === paper.branch_code
      )?.short_name || paper.branch_code;
  
    return (
      <div className="group bg-white border border-gray-200 rounded-[28px] p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
  
        {/* TOP */}
        <div className="flex items-start justify-between gap-4">
  
          {/* TITLE */}
          <div className="min-w-0">
  
            <h3 className="text-xl font-bold text-gray-900 leading-snug line-clamp-2">
  
              {paper.name}
  
            </h3>
  
            <p className="text-sm text-gray-500 mt-2 font-medium tracking-wide">
  
              {paper.req_paper_code}
  
            </p>
  
          </div>
  
          {/* SEM + BRANCH */}
          <div className="flex flex-col items-end gap-2 shrink-0">
  
            <div className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
  
              Sem {paper.semester_code}
  
            </div>
  
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
  
              {branch}
  
            </div>
  
          </div>
  
        </div>
  
  
        {/* TAGS */}
        <div className="flex flex-wrap gap-2 mt-5">
  
          <span className="bg-gray-100 text-gray-700 text-sm font-medium rounded-full px-3 py-1.5">
  
            {paper.year}
  
          </span>
  
          <span className="bg-blue-50 text-blue-700 text-sm font-medium rounded-full px-3 py-1.5 border border-blue-100">
  
            {paper.exam_type}
  
          </span>
  
          <span className="bg-purple-50 text-purple-700 text-sm font-medium rounded-full px-3 py-1.5 border border-purple-100 capitalize">
  
            {paper.paper_type} Exam
  
          </span>
  
        </div>
  
  
        {/* STATUS BLOCK */}
        <div className="mt-5">
  
          {type === "review" && (
  
            <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4">
  
              <div className="flex items-center gap-2">
  
                <Clock3
                  size={18}
                  className="text-yellow-700"
                />
  
                <p className="text-yellow-700 font-semibold">
                  Under Review
                </p>
  
              </div>
  
              <p className="text-sm text-yellow-700/90 mt-2 leading-relaxed">
  
                {contributor}
  
              </p>
  
            </div>
          )}
  
  
          {type === "approved" && (
  
            <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
  
              <div className="flex items-center gap-2">
  
                <CheckCircle2
                  size={18}
                  className="text-green-700"
                />
  
                <p className="text-green-700 font-semibold">
                  Approved Contribution
                </p>
  
              </div>
  
              <p className="text-sm text-green-700/90 mt-2 leading-relaxed">
  
                {contributor}
  
              </p>
  
            </div>
          )}
  
        </div>
  
  
        {/* ACTION */}
        {type === "upload" && (
  
          <button
            onClick={() => onUpload?.(paper)}
            className="mt-6 w-full bg-black text-white py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.99] transition-all duration-200 font-semibold flex items-center justify-center gap-2"
          >
  
            <Upload size={18} />
  
            Upload PDF
  
          </button>
        )}
  
      </div>
    );
  }