import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import WorkspaceSection, { fieldClass, labelClass, textAreaClass } from "./WorkspaceSection";

export default function CompanyProfileSection({ questionnaire, response, onChange, sectionNumber, disabled }: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find((entry) => entry.sectionId === "company_profile");
  const config = questionnaire.companyProfile;
  const profile = response.companyProfile;
  const update = (patch: Partial<typeof profile>) => onChange({ ...response, companyProfile: { ...profile, ...patch } });
  const mixTotal = profile.clientMix.reduce((sum, entry) => sum + entry.percent, 0);

  return (
    <WorkspaceSection number={sectionNumber} title={section?.title ?? "Company profile"} helperText={section?.helperText} evaluationMappings={section?.evaluationMappings}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Legal company name {config.legalNameRequired ? <span className="text-rose-600">*</span> : null}
          <input className={fieldClass} value={profile.legalName} disabled={disabled} onChange={(event) => update({ legalName: event.target.value })} />
        </label>
        <label className={labelClass}>Headquarters {config.headquartersRequired ? <span className="text-rose-600">*</span> : null}
          <input className={fieldClass} value={profile.headquarters} disabled={disabled} placeholder="City, state / region" onChange={(event) => update({ headquarters: event.target.value })} />
        </label>
        {config.yearsInBusinessEnabled ? <label className={labelClass}>Years in business
          <input className={fieldClass} type="number" min="0" value={profile.yearsInBusiness ?? ""} disabled={disabled} onChange={(event) => update({ yearsInBusiness: event.target.value === "" ? undefined : Number(event.target.value) })} />
        </label> : null}
        {config.staffCountEnabled ? <label className={labelClass}>Full-time staff
          <input className={fieldClass} type="number" min="0" value={profile.staffCount ?? ""} disabled={disabled} onChange={(event) => update({ staffCount: event.target.value === "" ? undefined : Number(event.target.value) })} />
        </label> : null}
        {config.largestComparableEventEnabled ? <label className={`${labelClass} sm:col-span-2`}>Largest comparable event <span className="text-rose-600">*</span>
          <textarea className={textAreaClass} value={profile.largestComparableEvent} disabled={disabled} placeholder="Describe scale, scope, and services delivered." onChange={(event) => update({ largestComparableEvent: event.target.value })} />
        </label> : null}
      </div>

      {config.clientMix.enabled ? (
        <fieldset className="mt-7 border-t border-[#e6ebef] pt-6">
          <div className="flex items-center justify-between gap-4">
            <legend className="text-sm font-extrabold text-[#16283c]">Client mix {config.clientMix.required ? "*" : ""}</legend>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${mixTotal === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`} aria-live="polite">Total {mixTotal}%</span>
          </div>
          <p className="mt-1 text-sm text-[#718496]">Enter 0 for categories that do not apply. Percentages must total 100%.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.clientMix.categories.map((category) => {
              const value = profile.clientMix.find((entry) => entry.categoryId === category.categoryId)?.percent;
              return <label className={labelClass} key={category.categoryId}>{category.label}
                <span className="relative block"><input className={`${fieldClass} pr-8`} type="number" min="0" max="100" value={value ?? ""} disabled={disabled} onChange={(event) => {
                  const next = profile.clientMix.filter((entry) => entry.categoryId !== category.categoryId);
                  next.push({ categoryId: category.categoryId, percent: event.target.value === "" ? 0 : Number(event.target.value) });
                  update({ clientMix: next });
                }} /><span className="pointer-events-none absolute right-3 top-3 text-sm text-[#718496]">%</span></span>
              </label>;
            })}
          </div>
        </fieldset>
      ) : null}
    </WorkspaceSection>
  );
}
