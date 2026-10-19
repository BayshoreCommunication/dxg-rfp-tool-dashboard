/** Loading states shaped like the real Support pages so nothing jumps on arrival. */
const bone = "animate-pulse rounded-md bg-slate-200/70";

export const SupportListSkeleton = () => (
  <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-16 pt-6 sm:px-6" aria-busy="true" aria-label="Loading support">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className={`h-2.5 w-36 ${bone}`} />
        <div className={`h-8 w-40 ${bone}`} />
        <div className={`h-3.5 w-[26rem] max-w-[80vw] ${bone}`} />
        <div className={`h-3.5 w-64 ${bone}`} />
      </div>
      <div className={`h-10 w-36 rounded-xl ${bone}`} />
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className={`h-5 w-32 ${bone}`} />
        <div className={`h-8 w-32 rounded-xl ${bone}`} />
      </div>
      <ul className="divide-y divide-slate-100">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-4">
            <div className={`mt-2 h-2.5 w-2.5 rounded-full ${bone}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-6 ${bone}`} />
                <div className={`h-4 ${bone}`} style={{ width: `${40 + ((i * 23) % 35)}%` }} />
                <div className={`h-4 w-16 rounded-full ${bone}`} />
              </div>
              <div className={`h-3 w-1/2 ${bone}`} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  </div>
);

export const SupportThreadSkeleton = () => (
  <div
    className="mx-auto flex h-[calc(100dvh-5.5rem)] w-full max-w-4xl flex-col px-4 pb-4 pt-4 sm:px-6 lg:h-[calc(100dvh-2rem)]"
    aria-busy="true"
    aria-label="Loading request"
  >
    <div className={`h-4 w-24 ${bone}`} />
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className={`h-3.5 w-6 ${bone}`} />
          <div className={`h-5 w-72 max-w-[60%] ${bone}`} />
          <div className={`h-5 w-20 rounded-full ${bone}`} />
        </div>
        <div className={`h-3 w-72 max-w-[70%] ${bone}`} />
      </div>
      <div className="flex-1 space-y-4 bg-slate-50/60 px-5 py-5">
        {[58, 40, 66, 36].map((width, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div className={`h-16 rounded-2xl ${bone}`} style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-slate-100 px-5 py-3">
        <div className={`h-16 w-full rounded-xl ${bone}`} />
        <div className="flex items-center justify-between">
          <div className={`h-7 w-48 rounded-lg ${bone}`} />
          <div className={`h-9 w-20 rounded-xl ${bone}`} />
        </div>
      </div>
    </section>
  </div>
);
