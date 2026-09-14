import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import WorkspaceSection, { fieldClass, labelClass } from "./WorkspaceSection";

export default function ComplianceSection({ questionnaire, response, onChange, sectionNumber, disabled }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find((entry) => entry.sectionId === "compliance");
  const updateIdentity = (key: keyof VendorResponseV1["identity"], value: string) =>
    onChange({ ...response, identity: { ...response.identity, [key]: value } });

  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "Compliance"} helperText={section?.helperText} evaluationMappings={section?.evaluationMappings}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          Vendor / company name {questionnaire.identity.vendorNameRequired ? <span className="text-rose-600">*</span> : null}
          <input className={fieldClass} value={response.identity.vendorName} disabled={disabled} autoComplete="organization" onChange={(event) => updateIdentity("vendorName", event.target.value)} />
        </label>
        <label className={labelClass}>
          Submitted by {questionnaire.identity.submittedByRequired ? <span className="text-rose-600">*</span> : null}
          <input className={fieldClass} value={response.identity.submittedBy} disabled={disabled} autoComplete="name" onChange={(event) => updateIdentity("submittedBy", event.target.value)} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Response contact email {questionnaire.identity.emailRequired ? <span className="text-rose-600">*</span> : null}
          <input className={fieldClass} type="email" value={response.identity.email} disabled={disabled} autoComplete="email" onChange={(event) => updateIdentity("email", event.target.value)} />
          <span className="mt-1.5 block font-normal text-[#718496]">This can differ from the address that received the invitation.</span>
        </label>
      </div>

      {questionnaire.acknowledgements.length ? (
        <fieldset className="mt-7 border-t border-[#e6ebef] pt-6">
          <legend className="text-sm font-extrabold text-[#16283c]">Required acknowledgements</legend>
          <div className="mt-3 space-y-3">
            {questionnaire.acknowledgements.map((acknowledgement) => {
              const answer = response.acknowledgements.find((entry) => entry.acknowledgementId === acknowledgement.acknowledgementId);
              return (
                <label key={acknowledgement.acknowledgementId} className="flex cursor-pointer items-start gap-3 rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4 text-sm text-[#334b60] focus-within:border-[#008ad2] focus-within:ring-3 focus-within:ring-[#dff3fc]">
                  <input
                    className="mt-0.5 h-4 w-4 accent-[#008ad2]"
                    type="checkbox"
                    checked={answer?.accepted ?? false}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = response.acknowledgements.filter((entry) => entry.acknowledgementId !== acknowledgement.acknowledgementId);
                      next.push({ acknowledgementId: acknowledgement.acknowledgementId, accepted: event.target.checked, textChecksum: acknowledgement.textChecksum });
                      onChange({ ...response, acknowledgements: next });
                    }}
                  />
                  <span><b className="block text-[#16283c]">{acknowledgement.label}{acknowledgement.required ? " *" : ""}</b>{acknowledgement.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </WorkspaceSection>
  );
}
