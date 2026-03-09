import { Edit3, FileText, MailOpen, MousePointer2, Send } from "lucide-react";
import React from "react";

// --- Types ---
type Status = "PUBLISHED" | "DRAFT";

interface Stat {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  iconColor: string;
}

interface Proposal {
  id: string;
  name: string;
  prospect: string;
  clicked: number;
  opened: number;
  price: number;
  status: Status;
}

// --- Mock Data ---
const STATS: Stat[] = [
  {
    title: "Total Proposals",
    value: "182",
    icon: <FileText size={16} />,
    color: "text-green-500",
    iconColor: "text-blue-500",
  },
  {
    title: "Total Email Sent",
    value: "1827",
    icon: <Send size={16} />,
    color: "text-cyan-400",
    iconColor: "text-cyan-400",
  },
  {
    title: "Total Email Opened",
    value: "1303",
    icon: <MailOpen size={16} />,
    color: "text-pink-500",
    iconColor: "text-pink-500",
  },
  {
    title: "Total Email Clicked",
    value: "1827",
    icon: <MousePointer2 size={16} />,
    color: "text-orange-500",
    iconColor: "text-orange-500",
  },
];

const PROPOSALS: Proposal[] = [
  {
    id: "100011",
    name: "Digital Marketing Proposal Tem...",
    prospect: "Demo",
    clicked: 465,
    opened: 45,
    price: 5900,
    status: "PUBLISHED",
  },
  {
    id: "100011",
    name: "Digital Marketing Proposal Tem...",
    prospect: "Demo",
    clicked: 463,
    opened: 234,
    price: 5900,
    status: "DRAFT",
  },
  {
    id: "100011",
    name: "Digital Marketing Proposal Tem...",
    prospect: "Demo",
    clicked: 123,
    opened: 28,
    price: 5900,
    status: "PUBLISHED",
  },
];

export default function ProposalsTableList() {
  return (
    <div className="">
      {/* 2. Proposals Table Section */}
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="bg-[#98D8E9] rounded-sm px-6 py-3 grid grid-cols-12 text-[13px] font-bold text-gray-700">
          <div className="col-span-3">Proposal Name</div>
          <div className="col-span-2 text-center">Prospect</div>
          <div className="col-span-1 text-center">Clicked</div>
          <div className="col-span-1 text-center">Opened</div>
          <div className="col-span-2 text-center">Price</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <h2 className="text-gray-400 text-sm font-medium pt-2">
          February 2024
        </h2>

        {/* Proposal Rows */}
        <div className="space-y-3">
          {PROPOSALS.map((item, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-12 items-center bg-white px-6 py-4 rounded-sm shadow-sm border-l-4 transition-hover hover:shadow-md ${
                item.status === "PUBLISHED"
                  ? "border-cyan-400"
                  : "border-gray-400"
              }`}
            >
              <div className="col-span-3">
                <div className="text-sm font-medium text-gray-800">
                  {item.name}
                </div>
                <div className="text-xs text-gray-400">{item.id}</div>
              </div>
              <div className="col-span-2 text-center text-sm text-gray-600">
                {item.prospect}
              </div>
              <div className="col-span-1 text-center text-sm text-gray-600">
                {item.clicked}
              </div>
              <div className="col-span-1 text-center text-sm text-gray-600">
                {item.opened}
              </div>
              <div className="col-span-2 text-center text-sm text-gray-600 font-medium">
                ${item.price.toLocaleString()}
              </div>
              <div className="col-span-2 flex justify-center">
                <span
                  className={`px-6 py-1 rounded-full text-[11px] font-bold tracking-wider ${
                    item.status === "PUBLISHED"
                      ? "bg-cyan-100 text-cyan-500"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <button className="flex items-center gap-1 bg-[#F5F3FF] text-[#5B21B6] px-3 py-1.5 rounded-md text-xs font-bold hover:bg-violet-100 transition-colors">
                  <Edit3 size={14} /> EDIT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
