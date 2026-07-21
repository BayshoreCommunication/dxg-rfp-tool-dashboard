const text=(value:unknown,fallback="Not reported")=>typeof value==="string"&&value.trim()?value:fallback;
const tokens=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value.toLocaleString():"Not reported";

export default function AiRunEvidence({run}:{run:Record<string,unknown>}){
 return <aside aria-label="AI run evidence" className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">Run evidence</h3><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">Read-only candidate</span></div>
  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
   <div><dt className="text-slate-500">Provider</dt><dd className="font-medium text-slate-900">{text(run.provider)}</dd></div>
   <div><dt className="text-slate-500">Model</dt><dd className="font-medium text-slate-900">{text(run.model)}</dd></div>
   <div><dt className="text-slate-500">Input tokens</dt><dd className="font-medium text-slate-900">{tokens(run.input_tokens)}</dd></div>
   <div><dt className="text-slate-500">Output tokens</dt><dd className="font-medium text-slate-900">{tokens(run.output_tokens)}</dd></div>
  </dl>
  <p className="mt-2 text-xs text-slate-500">Proposal mutation: No · Automatic publication: No</p>
 </aside>;
}
