interface Props {
    missing: number;
    underReview: number;
    approved: number;
    rejected: number;
  }
  
  export default function StatsCards({
    missing,
    underReview,
    approved,
    rejected,
  }: Props) {
    const cards = [
      {
        label: "Missing",
        value: missing,
        color: "bg-red-50 border-yellow-200",
      },
      {
        label: "Under Review",
        value: underReview,
        color: "bg-yellow-50 border-blue-200",
      },
      {
        label: "Approved",
        value: approved,
        color: "bg-green-50 border-green-200",
      },
      {
        label: "Rejected",
        value: rejected,
        color: "bg-red-200 border-red-200",
      },
    ];
  
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 shadow-sm ${card.color}`}
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <h2 className="text-3xl font-bold mt-2">{card.value}</h2>
          </div>
        ))}
      </div>
    );
  }