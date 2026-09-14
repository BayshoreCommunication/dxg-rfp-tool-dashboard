import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { wordCount } from "@/lib/vendorResponses/workspaceModel";
import { Sparkles } from "lucide-react";
import WorkspaceSection, {
  labelClass,
  textAreaClass,
} from "./WorkspaceSection";

export default function ValueAddsSection({
  questionnaire,
  response,
  onChange,
  sectionNumber,
  disabled,
}: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
}) {
  const section = questionnaire.sections.find(
    (entry) => entry.sectionId === "value_adds",
  );
  const count = wordCount(response.valueAdds);
  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Optional value-adds"}
      helperText={
        section?.helperText ??
        "Share useful additions that are not included in the base price or alternates."
      }
      evaluationMappings={section?.evaluationMappings}
    >
      <div className="mb-5 flex gap-3 rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-4">
        <Sparkles
          size={20}
          className="shrink-0 text-[#008ad2]"
          aria-hidden="true"
        />
        <p className="text-sm leading-5 text-[#52687b]">
          Keep this focused on measurable client benefit. Pricing changes belong
          in Alternates so the evaluator can compare totals consistently.
        </p>
      </div>
      <label className={labelClass}>
        Value-add summary{" "}
        {questionnaire.valueAdds.required ? "*" : "(optional)"}
        <textarea
          className={`${textAreaClass} min-h-52`}
          value={response.valueAdds}
          disabled={disabled}
          placeholder="Describe training, reusable deliverables, sustainability benefits, or service enhancements included at no base-price change."
          onChange={(event) =>
            onChange({ ...response, valueAdds: event.target.value })
          }
        />
        <span
          className={`mt-1 block text-right font-normal ${count > questionnaire.valueAdds.maxWords ? "text-rose-700" : "text-[#718496]"}`}
        >
          {count}/{questionnaire.valueAdds.maxWords} words
        </span>
      </label>
    </WorkspaceSection>
  );
}
