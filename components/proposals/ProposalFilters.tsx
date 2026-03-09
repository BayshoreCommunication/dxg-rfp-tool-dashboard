import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  Filter,
  Folder,
  Search,
  Trash2,
  Users,
} from "lucide-react";

export default function ProposalFilters() {
  return (
    <div className="w-full bg-white p-4 rounded-sm border-b border-gray-200">
      <div className=" flex items-center justify-between gap-4">
        {/* Left Side: Date Range & Search/Filter Icons */}
        <div className="flex items-center gap-6">
          {/* Date Range Picker Mockup */}
          <div className="flex items-center border-b border-gray-300 pb-1 relative group">
            <input
              type="text"
              placeholder="Start Date"
              className="bg-transparent text-sm text-gray-400 outline-none w-24 placeholder:text-gray-300"
            />
            <span className="mx-2 text-gray-300">→</span>
            <input
              type="text"
              placeholder="End Date"
              className="bg-transparent text-sm text-gray-400 outline-none w-24 placeholder:text-gray-300"
            />
            <CalendarIcon
              size={18}
              className="ml-2 text-cyan-400 cursor-pointer"
            />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-4 text-cyan-500">
            <button className="hover:opacity-70 transition-opacity">
              <Search size={20} />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Filter size={20} />
            </button>

            {/* Sort Button */}
            <button className="flex items-center gap-1 bg-cyan-400 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm hover:bg-cyan-500 transition-colors">
              <ArrowUpDown size={14} />
              CREATED (NEWEST)
            </button>

            {/* Management Icons */}
            <button className="hover:opacity-70 transition-opacity">
              <Users size={20} />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Folder size={20} />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Right Side: Acceptance Stats */}
        <div className="flex items-center gap-12">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800 leading-none">
              0
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Approved Proposals
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800 leading-none">
              0
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Acceptance Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
