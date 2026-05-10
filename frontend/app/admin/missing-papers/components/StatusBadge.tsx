interface Props {
    status: string;
  }
  
  const statusStyles: Record<string, string> = {
    missing: "bg-yellow-100 text-yellow-700",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  
  export default function StatusBadge({ status }: Props) {
    return (
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${statusStyles[status]}`}
      >
        {status.replace("_", " ")}
      </div>
    );
  }