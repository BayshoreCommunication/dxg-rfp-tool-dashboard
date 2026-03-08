import {
  FileText,
  Mail,
  MailOpen,
  MousePointerClick,
  Plus,
} from "lucide-react";

const stats = [
  {
    label: "Total Proposals",
    value: "182",
    icon: <FileText size={18} />,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    label: "Total Email Sent",
    value: "1,827",
    icon: <Mail size={18} />,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    label: "Total Email Opened",
    value: "1,303",
    icon: <MailOpen size={18} />,
    color: "text-pink-500",
    bg: "bg-pink-50",
    border: "border-pink-100",
  },
  {
    label: "Total Email Clicked",
    value: "1,827",
    icon: <MousePointerClick size={18} />,
    color: "text-orange-400",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
];

const proposals = [
  {
    id: "100011",
    title: "Digital Marketing Proposal Template",
    client: "Demo",
    amount: "$5,900",
    status: "PUBLISHED",
  },
  {
    id: "100012",
    title: "Digital Marketing Proposal Template",
    client: "Demo",
    amount: "$5,900",
    status: "DRAFT",
  },
  {
    id: "100013",
    title: "Digital Marketing Proposal Template",
    client: "Demo",
    amount: "$5,900",
    status: "PUBLISHED",
  },
  {
    id: "100014",
    title: "Digital Marketing Proposal Template",
    client: "Demo",
    amount: "$5,900",
    status: "PUBLISHED",
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const isPublished = status === "PUBLISHED";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold tracking-widest uppercase ${
        isPublished
          ? "bg-primary/10 text-primary"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
  );
};

const DashboardDetials = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-400 font-medium">
            Welcome back — here&apos;s your overview
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-widest text-white shadow-[0_4px_14px_rgba(45,198,245,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(45,198,245,0.45)] active:translate-y-0">
          <Plus size={16} strokeWidth={3} />
          New Proposal
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${stat.border}`}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg} ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[12.5px] font-bold text-gray-500">
                {stat.label}
              </span>
            </div>
            <p className={`text-3xl font-extrabold tracking-tight ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Proposals */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-gray-900">
            Recent Proposals
          </h2>
          <button className="text-[13px] font-bold text-primary hover:underline underline-offset-2 transition-colors">
            View all
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {proposals.map((proposal, i) => (
            <div
              key={proposal.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/70 ${
                i !== proposals.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              {/* Left accent */}
              <div className="w-[3px] h-10 rounded-full bg-primary/30 shrink-0" />

              {/* Title + ID */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-gray-800">
                  {proposal.title}
                </p>
                <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                  {proposal.id}
                </p>
              </div>

              {/* Client */}
              <p className="w-24 shrink-0 text-[13px] font-semibold text-gray-500 hidden sm:block">
                {proposal.client}
              </p>

              {/* Amount */}
              <p className="w-24 shrink-0 text-right text-[14px] font-extrabold text-gray-800 hidden md:block">
                {proposal.amount}
              </p>

              {/* Status */}
              <div className="shrink-0">
                <StatusBadge status={proposal.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardDetials;