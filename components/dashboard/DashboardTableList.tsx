// 1. Define strict TypeScript types
type Status = "PUBLISHED" | "DRAFT";

interface Proposal {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: Status;
}

// 2. Mock Data (Replace this with your actual API fetch later)
const PROPOSALS_DATA: Proposal[] = [
  {
    id: "100011",
    title: "Digital Marketing Proposal Tem...",
    client: "Demo",
    amount: 5900,
    status: "PUBLISHED",
  },
  {
    id: "100011",
    title: "Digital Marketing Proposal Tem...",
    client: "Demo",
    amount: 5900,
    status: "DRAFT",
  },
  {
    id: "100011",
    title: "Digital Marketing Proposal Tem...",
    client: "Demo",
    amount: 5900,
    status: "PUBLISHED",
  },
  {
    id: "100011",
    title: "Digital Marketing Proposal Tem...",
    client: "Demo",
    amount: 5900,
    status: "PUBLISHED",
  },
];

// 3. Reusable Card Component
const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
  const isPublished = proposal.status === "PUBLISHED";

  return (
    <div
      className={`
        bg-white shadow-sm rounded-r-md rounded-l-md mb-3 
        border-l-4 flex items-center justify-between px-6 py-4 transition-all hover:shadow-md
        ${isPublished ? "border-sky-400" : "border-gray-400"}
      `}
    >
      {/* Grid container to perfectly align columns regardless of content length */}
      <div className="grid grid-cols-12 w-full items-center gap-4">
        {/* Title & ID Column */}
        <div className="col-span-5 flex flex-col">
          <h3 className="text-sm font-medium text-gray-800">
            {proposal.title}
          </h3>
          <span className="text-xs text-gray-400 mt-1">{proposal.id}</span>
        </div>

        {/* Client Column */}
        <div className="col-span-3 text-sm text-gray-700 font-medium">
          {proposal.client}
        </div>

        {/* Amount Column */}
        <div className="col-span-2 text-sm text-gray-700 font-medium">
          {/* Format the number as currency */}${" "}
          {proposal.amount.toLocaleString()}
        </div>

        {/* Status Badge Column */}
        <div className="col-span-2 flex justify-end">
          <span
            className={`
              px-6 py-1.5 text-xs font-bold rounded-full tracking-wide
              ${
                isPublished
                  ? "bg-[#E0F7FA] text-[#26C6DA]" // Custom hex to match your image's cyan
                  : "bg-gray-200 text-gray-600"
              }
            `}
          >
            {proposal.status}
          </span>
        </div>
      </div>
    </div>
  );
};

// 4. Main Page Component
export default function DashboardTableList() {
  return (
    <div className="">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 tracking-tight">
        Recent Proposals
      </h2>

      <div className="flex flex-col gap-1">
        {PROPOSALS_DATA.map((proposal, index) => (
          <ProposalCard key={`${proposal.id}-${index}`} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}
