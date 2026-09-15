import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import type { VendorWorkspaceIssue } from "@/lib/vendorResponses/workspaceModel";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import WorkspaceSection from "./WorkspaceSection";

export default function ReviewSubmitSection({ questionnaire, response, issues, sectionNumber, onNavigate }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  issues: VendorWorkspaceIssue[];
  sectionNumber: number;
  onNavigate: (sectionId: string) => void;
}) {
  const section = questionnaire.sections.find((entry) => entry.sectionId === "review");
  const grouped = new Map<string, VendorWorkspaceIssue[]>();
  for (const issue of issues) grouped.set(issue.sectionId, [...(grouped.get(issue.sectionId) ?? []), issue]);
  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "Review and submit"} helperText="RFPilot checks the saved response against the published questionnaire before creating an immutable submission version.">
      {issues.length === 0 ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} aria-hidden="true" /><div><h2 className="font-extrabold text-emerald-950">Ready to submit</h2><p className="mt-1 text-sm leading-5 text-emerald-800">All required responses are complete. Review the live total, then use Submit proposal in the dock.</p></div></div></div> : <div><div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-5"><AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={20} aria-hidden="true" /><div><h2 className="font-extrabold text-amber-950">{issues.length} item{issues.length === 1 ? "" : "s"} still need attention</h2><p className="mt-1 text-sm leading-5 text-amber-800">Your draft remains saved. Complete these items before final submission.</p></div></div><div className="mt-5 space-y-3">{[...grouped].map(([sectionId, sectionIssues]) => { const label = questionnaire.sections.find((entry) => entry.sectionId === sectionId)?.title ?? sectionId; return <section className="rounded-md border border-[#dce4eb] p-4" key={sectionId}><button type="button" onClick={() => onNavigate(sectionId)} className="font-extrabold text-[#0075b4] hover:underline">{label} · {sectionIssues.length}</button><ul className="mt-2 space-y-1 text-sm text-[#52687b]">{sectionIssues.slice(0, 6).map((entry) => <li key={`${entry.path}-${entry.message}`}>• {entry.message}</li>)}{sectionIssues.length > 6 ? <li>• {sectionIssues.length - 6} more in this section</li> : null}</ul></section>; })}</div></div>}
      <dl className="mt-6 grid gap-3 rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4 text-sm sm:grid-cols-3"><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718496]">Vendor</dt><dd className="mt-1 font-extrabold text-[#16283c]">{response.identity.vendorName || "Not entered"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718496]">Rooms</dt><dd className="mt-1 font-extrabold text-[#16283c]">{response.rooms.length} of {questionnaire.rooms.length} started</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718496]">Questionnaire</dt><dd className="mt-1 font-extrabold text-[#16283c]">Version {questionnaire.questionnaireVersion}</dd></div></dl>
    </WorkspaceSection>
  );
}
