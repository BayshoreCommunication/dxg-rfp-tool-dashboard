const TopHeader = () => {
  return (
    <div className="">
      {" "}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-none">
            Email Templates & Reminders
          </h1>
        </div>

        {/* <button className="group relative flex items-center gap-2 overflow-hidden rounded-md bg-gradient-to-br from-[#2dc6f5] to-[#0ea5e9] px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(45,198,245,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(45,198,245,0.50)] active:translate-y-0 cursor-pointer">
         
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/15 skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-full" />
 
          New Proposal         <Plus size={16} strokeWidth={3} />
        </button> */}
      </div>
    </div>
  );
};

export default TopHeader;
