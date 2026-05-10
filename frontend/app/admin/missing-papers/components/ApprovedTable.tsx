import { MissingPaper } from "../types/missing-paper";
import StatusBadge from "./StatusBadge";

interface Props {
  data: MissingPaper[];
}

export default function ApprovedTable({ data }: Props) {
  if (!data.length) {
    return (
      <div className="border rounded-2xl p-10 text-center text-muted-foreground bg-white">
        No approved papers.
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
            <th className="p-4">Status</th>
            <th className="p-4">PDF</th>
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

              <td className="p-4">{paper.year}</td>

              <td className="p-4">
                <StatusBadge status={paper.status} />
              </td>

              <td className="p-4">
                <a
                  href={paper.final_pdf_url}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  View PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}