export default function AiAssistantLoading() {
  return (
    <div
      role="status"
      aria-label="Loading AI Assistant"
      className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1320px] flex-col"
    >
      <div className="mb-3 h-5 w-24 animate-pulse rounded bg-slate-200" />
      <div className="flex min-h-[620px] flex-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white">
        <div className="hidden w-[270px] border-r border-slate-100 bg-slate-50/70 p-4 lg:block">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 space-y-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-200/70"
              />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="h-16 border-b border-slate-100 px-6 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xl space-y-4 px-8">
              <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-cyan-100" />
              <div className="mx-auto h-8 w-52 animate-pulse rounded bg-slate-200" />
              <div className="mx-auto h-5 w-80 max-w-full animate-pulse rounded bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
