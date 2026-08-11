import { AlertCircle } from "lucide-react";

export type ProposalValidationSummaryProps = {
  section: string;
  issues: string[];
};

export default function ProposalValidationSummary({
  section,
  issues,
}: ProposalValidationSummaryProps) {
  if (issues.length === 0) return null;

  return (
    <section
      aria-labelledby="proposal-validation-summary-title"
      className="m-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:m-6"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={20} aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="proposal-validation-summary-title" className="text-sm font-extrabold">
            {section} needs {issues.length} {issues.length === 1 ? "item" : "items"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Complete the highlighted fields below. This list updates as you fix them.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
