"use client";

import { useState } from "react";
import { MissingPaper } from "../types/missing-paper";
import StatusBadge from "./StatusBadge";
import DeleteDialog from "./DeleteDialog";

interface Props {
  data: MissingPaper[];
}

export default function MissingRejectedTable({ data }: Props) {
  const [selectedPaper, setSelectedPaper] = useState<MissingPaper | null>(null);

  if (!data.length) {
    return (
      <div className="border rounded-2xl p-10 text-center text-muted-foreground bg-white">
        No missing or rejected papers found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-2xl bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-4">Subject</th>
            <th className="p-4">Year</th>
            <th className="p-4">Type</th>
            <th className="p-4">Status</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((paper) => (
            <tr key={paper._id} className="border-t hover:bg-gray-50">
              <td className="p-4">
                <div>
                  <p className="font-medium">{paper.subject_code}({paper?.req_paper_code})</p>
                  <p className="text-xs text-muted-foreground">
                    {paper.name}
                  </p>
                </div>
              </td>

              <td className="p-4">{paper.year}</td>

              <td className="p-4">
                {paper.exam_type} / {paper.paper_type}
              </td>

              <td className="p-4">
                <StatusBadge status={paper.status} />
              </td>

              <td className="p-4">
                <div className="flex gap-2">
                  <button className="border px-4 py-2 rounded-lg hover:bg-gray-100">
                    Edit
                  </button>

                  <button
                    onClick={() => setSelectedPaper(paper)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DeleteDialog
        paper={selectedPaper}
        open={!!selectedPaper}
        onClose={() => setSelectedPaper(null)}
      />
    </div>
  );
}