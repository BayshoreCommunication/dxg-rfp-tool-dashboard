import { ChevronRight } from "lucide-react";

const text = (value: unknown, fallback = "Not reported") =>
  typeof value === "string" && value.trim() ? value : fallback;
const tokens = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "Not reported";

export default function AiRunEvidence({
  run,
}: {
  run: Record<string, unknown>;
}) {
  return (
    <details className="group mt-5 rounded-lg border border-slate-200 bg-slate-50/70">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-600 marker:hidden">
        <span className="inline-flex items-center gap-2">
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-open:rotate-90"
          />
          AI processing details
        </span>
      </summary>
      <aside
        aria-label="AI processing details"
        className="border-t border-slate-200 px-4 py-4"
      >
        <p className="text-xs text-slate-500">
          These details can help an administrator troubleshoot this review. They
          do not affect your proposal.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Provider</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {text(run.provider)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Model</dt>
            <dd className="mt-0.5 break-words font-medium text-slate-900">
              {text(run.model)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Input tokens</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {tokens(run.input_tokens)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Output tokens</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {tokens(run.output_tokens)}
            </dd>
          </div>
        </dl>
      </aside>
    </details>
  );
}
