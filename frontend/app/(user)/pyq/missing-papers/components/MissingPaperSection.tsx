import MissingPaperCard from "./MissingPaperCard";

interface Props {
  title: string;
  subtitle: string;
  papers: any[];
  type: "upload" | "review" | "approved";
  loading?: boolean;
  onUpload?: (paper: any) => void;
}

export default function MissingPaperSection({
  title,
  subtitle,
  papers,
  type,
  loading,
  onUpload,
}: Props) {

  return (
    <div className="space-y-5">

      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {title}
        </h2>

        <p className="text-gray-500 mt-1">
          {subtitle}
        </p>
      </div>

      {loading ? (
        <div className="bg-white border rounded-3xl p-10 text-center text-gray-500">
          Loading papers...
        </div>
      ) : papers.length === 0 ? (
        <div className="bg-white border rounded-3xl p-10 text-center text-gray-500">
          No papers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {papers.map((paper) => (
            <MissingPaperCard
              key={paper._id}
              paper={paper}
              type={type}
              onUpload={onUpload}
            />
          ))}

        </div>
      )}

    </div>
  );
}