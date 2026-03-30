const DashboardSkeleton = () => {
  return (
    <>
      <div className="px-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="min-h-[160px] rounded-2xl border border-slate-200 bg-slate-100/70 p-6 animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="space-y-6 px-5">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div className="h-5 w-36 rounded bg-slate-100 animate-pulse" />
            <div className="h-9 w-72 rounded bg-slate-100 animate-pulse" />
          </div>

          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 w-full rounded bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardSkeleton;

