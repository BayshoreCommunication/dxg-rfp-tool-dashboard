import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { wordCount } from "@/lib/vendorResponses/workspaceModel";
import { Check, ImageUp, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import type { UploadDocuments } from "./documentTypes";
import WorkspaceSection, {
  fieldClass,
  labelClass,
  textAreaClass,
} from "./WorkspaceSection";

const newId = () =>
  `crew-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

export default function CrewSection({
  questionnaire,
  response,
  onChange,
  sectionNumber,
  disabled,
  canUpload,
  onUpload,
}: {
  questionnaire: VendorResponseQuestionnaireV1;
  response: VendorResponseV1;
  onChange: (response: VendorResponseV1) => void;
  sectionNumber: number;
  disabled: boolean;
  canUpload: boolean;
  onUpload: UploadDocuments;
}) {
  const section = questionnaire.sections.find(
    (entry) => entry.sectionId === "crew",
  );
  const imageCategory = questionnaire.documents.categories.find((entry) =>
    entry.allowedMimeTypes.some((type) => type.startsWith("image/")),
  );
  const [uploadingId, setUploadingId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const uploadForId = useRef("");
  const covered = new Set(response.crew.map((member) => member.roleId));

  const uploadHeadshot = async (files: FileList | null) => {
    const crewMemberId = uploadForId.current;
    const member = response.crew.find(
      (entry) => entry.crewMemberId === crewMemberId,
    );
    if (!files?.length || !member || !imageCategory) return;
    setUploadingId(crewMemberId);
    setUploadError("");
    const result = await onUpload({
      purposeId: imageCategory.purposeId,
      scopeType: "crew_member",
      scopeId: crewMemberId,
      files: [files[0]],
    });
    if (!result.ok) setUploadError(result.message);
    setUploadingId("");
  };

  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Crew & bios"}
      helperText={
        section?.helperText ??
        `Add each proposed team member, their project role, and a concise bio of no more than ${questionnaire.crew.bioMaxWords} words.`
      }
      evaluationMappings={section?.evaluationMappings}
    >
      {questionnaire.crew.requiredRoleIds.length ? (
        <div className="mb-5 rounded-md border border-[#dce4eb] bg-[#f8fafb] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#42576a]">
            Required role coverage
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {questionnaire.crew.requiredRoleIds.map((roleId) => {
              const role = questionnaire.crew.roles.find(
                (entry) => entry.id === roleId,
              );
              const complete = covered.has(roleId);
              return (
                <span
                  key={roleId}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                >
                  {complete ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    <X size={12} aria-hidden="true" />
                  )}
                  {role?.label ?? roleId}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="space-y-4">
        {response.crew.map((member, index) => {
          const count = wordCount(member.bio);
          const hasLinkedDocuments =
            Boolean(member.headshotDocumentId) ||
            response.documents.some(
              (document) =>
                document.scopeType === "crew_member" &&
                document.scopeId === member.crewMemberId,
            );
          return (
            <fieldset
              key={member.crewMemberId}
              className="rounded-md border border-[#dce4eb] p-4 sm:p-5"
            >
              <legend className="px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#607487]">
                Crew member {index + 1}
              </legend>
              <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                <label className={labelClass}>
                  Full name *
                  <input
                    className={fieldClass}
                    value={member.name}
                    disabled={disabled}
                    placeholder="Full name"
                    onChange={(event) =>
                      onChange({
                        ...response,
                        crew: response.crew.map((entry) =>
                          entry.crewMemberId === member.crewMemberId
                            ? { ...entry, name: event.target.value }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Role in this project *
                  <select
                    className={fieldClass}
                    value={member.roleId}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        crew: response.crew.map((entry) =>
                          entry.crewMemberId === member.crewMemberId
                            ? { ...entry, roleId: event.target.value }
                            : entry,
                        ),
                      })
                    }
                  >
                    {questionnaire.crew.roles.map((role) => (
                      <option value={role.id} key={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={disabled || hasLinkedDocuments}
                  title={
                    hasLinkedDocuments
                      ? "Retire this crew member’s attachments in Document uploads first."
                      : undefined
                  }
                  aria-label={`Remove ${member.name || `crew member ${index + 1}`}`}
                  className="grid h-10 w-10 place-items-center rounded-md text-[#718496] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  onClick={() =>
                    onChange({
                      ...response,
                      crew: response.crew.filter(
                        (entry) => entry.crewMemberId !== member.crewMemberId,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
              <label className={`${labelClass} mt-4`}>
                Bio *
                <textarea
                  className={textAreaClass}
                  value={member.bio}
                  disabled={disabled}
                  placeholder="Summarize relevant experience, event scale, platforms, and years in role."
                  onChange={(event) =>
                    onChange({
                      ...response,
                      crew: response.crew.map((entry) =>
                        entry.crewMemberId === member.crewMemberId
                          ? { ...entry, bio: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
                <span
                  className={`mt-1 block text-right font-normal ${count > questionnaire.crew.bioMaxWords ? "text-rose-700" : "text-[#718496]"}`}
                >
                  {count}/{questionnaire.crew.bioMaxWords} words
                </span>
              </label>
              {questionnaire.crew.headshotAllowed ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    className="sr-only"
                    id={`headshot-${member.crewMemberId}`}
                    type="file"
                    accept={imageCategory?.allowedMimeTypes.join(",")}
                    disabled={
                      disabled ||
                      !canUpload ||
                      !imageCategory ||
                      uploadingId === member.crewMemberId
                    }
                    onChange={(event) =>
                      void uploadHeadshot(event.target.files)
                    }
                  />
                  <label
                    htmlFor={`headshot-${member.crewMemberId}`}
                    onClick={() => {
                      uploadForId.current = member.crewMemberId;
                    }}
                    className={`inline-flex items-center gap-2 rounded-md border border-[#008ad2] px-3 py-2 text-xs font-extrabold text-[#0075b4] ${disabled || !canUpload || !imageCategory ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#eef8fd]"}`}
                  >
                    <ImageUp size={14} aria-hidden="true" />
                    {uploadingId === member.crewMemberId
                      ? "Uploading…"
                      : member.headshotDocumentId
                        ? "Replace headshot"
                        : "Upload headshot"}
                  </label>
                  {member.headshotDocumentId ? (
                    <span className="text-xs font-bold text-emerald-700">
                      Headshot attached
                    </span>
                  ) : questionnaire.crew.headshotRequired ? (
                    <span className="text-xs font-bold text-rose-700">
                      Required
                    </span>
                  ) : (
                    <span className="text-xs text-[#718496]">
                      Optional JPG or PNG
                    </span>
                  )}
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
      {uploadError ? (
        <p className="mt-3 text-sm font-bold text-rose-700" role="alert">
          {uploadError}
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled || questionnaire.crew.roles.length === 0}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#008ad2] px-4 py-2.5 text-sm font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50"
        onClick={() =>
          onChange({
            ...response,
            crew: [
              ...response.crew,
              {
                crewMemberId: newId(),
                name: "",
                roleId: questionnaire.crew.roles[0]?.id ?? "",
                bio: "",
              },
            ],
          })
        }
      >
        <Plus size={15} aria-hidden="true" /> Add crew member
      </button>
    </WorkspaceSection>
  );
}
