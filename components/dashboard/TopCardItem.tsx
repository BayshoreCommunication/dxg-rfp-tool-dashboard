import React from "react";

// 1. Define the TypeScript interface
interface StatMetric {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}

// 2. Reusable Card Component
const StatCard = ({ title, value, icon, colorClass }: StatMetric) => {
  return (
    <div className="bg-white rounded-md shadow-sm p-6 flex flex-col justify-center border border-gray-100 min-w-[240px]">
      {/* Header: Icon + Title */}
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <h3 className="text-[15px] font-medium text-gray-900 leading-none mt-0.5">
          {title}
        </h3>
      </div>

      {/* Value */}
      <div className={`text-[32px] font-semibold tracking-tight ${colorClass}`}>
        {value}
      </div>
    </div>
  );
};

// 3. Main Dashboard Component
export default function TopCardItem() {
  // Data array with custom arbitrary Tailwind colors to match your image exactly
  const statsData: StatMetric[] = [
    {
      id: "proposals",
      title: "Total Proposals",
      value: "182",
      colorClass: "text-[#10e050]", // Vibrant green
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-[#3b82f6]"
        >
          <path
            fillRule="evenodd"
            d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "sent",
      title: "Total Email Sent",
      value: "1827",
      colorClass: "text-[#2fd2d8]", // Vibrant cyan
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-[#2fd2d8]"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      ),
    },
    {
      id: "opened",
      title: "Total Email Opened",
      value: "1303",
      colorClass: "text-[#e91e84]", // Vibrant pink
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-[#e91e84]"
        >
          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
        </svg>
      ),
    },
    {
      id: "clicked",
      title: "Total Email Clicked",
      value: "1827",
      colorClass: "text-[#ff8a33]", // Vibrant orange
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-[#ff8a33]"
        >
          <path
            fillRule="evenodd"
            d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="">
      {/* Using CSS Grid to ensure cards are responsive. 
        On mobile they stack, on medium+ screens they sit 4 in a row.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>
    </div>
  );
}
