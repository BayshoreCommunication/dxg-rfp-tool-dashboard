import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";
import { ImageUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { UploadDocuments } from "./documentTypes";
import WorkspaceSection, {
  fieldClass,
  labelClass,
  textAreaClass,
} from "./WorkspaceSection";

const newId = () =>
  `reference-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

export default function ReferencesSection({
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
    (entry) => entry.sectionId === "references",
  );
  const imageCategory = questionnaire.documents.categories.find((entry) =>
    entry.allowedMimeTypes.some((type) => type.startsWith("image/")),
  );
  const uploadForId = useRef("");
  const [uploadingId, setUploadingId] = useState("");
  const [error, setError] = useState("");
  const uploadVisual = async (files: FileList | null) => {
    const referenceId = uploadForId.current;
    const reference = response.references.find(
      (entry) => entry.referenceId === referenceId,
    );
    if (!files?.length || !reference || !imageCategory) return;
    const remaining = Math.max(
      0,
      questionnaire.references.maxVisualsPerReference -
        reference.visualDocumentIds.length,
    );
    if (!remaining) return;
    setUploadingId(referenceId);
    setError("");
    const result = await onUpload({
      purposeId: imageCategory.purposeId,
      scopeType: "reference",
      scopeId: referenceId,
      files: Array.from(files).slice(0, remaining),
    });
    if (!result.ok) setError(result.message);
    setUploadingId("");
  };
  return (
    <WorkspaceSection
      number={sectionNumber}
      title={section?.title ?? "Comparable references"}
      helperText={
        section?.helperText ??
        `Provide ${questionnaire.references.minimumCount}–${questionnaire.references.maximumCount} structured references from the last ${questionnaire.references.maxAgeMonths} months. Visuals are optional.`
      }
      evaluationMappings={section?.evaluationMappings}
    >
      <p className="mb-5 rounded-md border border-[#d8ebf5] bg-[#eef8fd] p-4 text-sm text-[#52687b]">
        <b className="text-[#16283c]">{response.references.length}</b> reference
        {response.references.length === 1 ? "" : "s"} added ·{" "}
        {questionnaire.references.maxVisualsPerReference} visual
        {questionnaire.references.maxVisualsPerReference === 1 ? "" : "s"}{" "}
        maximum per reference.
      </p>
      <div className="space-y-4">
        {response.references.map((reference, index) => {
          const hasLinkedDocuments =
            reference.visualDocumentIds.length > 0 ||
            response.documents.some(
              (document) =>
                document.scopeType === "reference" &&
                document.scopeId === reference.referenceId,
            );
          return (
            <fieldset
              key={reference.referenceId}
              className="rounded-md border border-[#dce4eb] p-4 sm:p-5"
            >
              <legend className="px-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#607487]">
                Reference {index + 1}
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Client name *
                  <input
                    className={fieldClass}
                    value={reference.clientName}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? { ...entry, clientName: event.target.value }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Event name *
                  <input
                    className={fieldClass}
                    value={reference.eventName}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? { ...entry, eventName: event.target.value }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Contact name
                  <input
                    className={fieldClass}
                    value={reference.contact.name}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                contact: {
                                  ...entry.contact,
                                  name: event.target.value,
                                },
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Contact email
                  <input
                    className={fieldClass}
                    type="email"
                    value={reference.contact.email}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                contact: {
                                  ...entry.contact,
                                  email: event.target.value,
                                },
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Contact phone
                  <input
                    className={fieldClass}
                    type="tel"
                    value={reference.contact.phone}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                contact: {
                                  ...entry.contact,
                                  phone: event.target.value,
                                },
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Attendance
                  <input
                    className={fieldClass}
                    type="number"
                    min="0"
                    value={reference.attendance ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                ...(event.target.value
                                  ? { attendance: Number(event.target.value) }
                                  : { attendance: undefined }),
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Start date
                  <input
                    className={fieldClass}
                    type="date"
                    value={reference.startDate ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                startDate: event.target.value || undefined,
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  End date
                  <input
                    className={fieldClass}
                    type="date"
                    value={reference.endDate ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? {
                                ...entry,
                                endDate: event.target.value || undefined,
                              }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className={labelClass}>
                  Current status
                  <input
                    className={fieldClass}
                    value={reference.currentStatus}
                    disabled={disabled}
                    placeholder="Current, completed, retained client…"
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? { ...entry, currentStatus: event.target.value }
                            : entry,
                        ),
                      })
                    }
                  />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-bold text-[#42576a]">
                  <input
                    className="h-4 w-4 accent-[#008ad2]"
                    type="checkbox"
                    checked={reference.comparable}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange({
                        ...response,
                        references: response.references.map((entry) =>
                          entry.referenceId === reference.referenceId
                            ? { ...entry, comparable: event.target.checked }
                            : entry,
                        ),
                      })
                    }
                  />
                  Comparable event
                </label>
              </div>
              <label className={`${labelClass} mt-4`}>
                Services provided *
                <textarea
                  className={textAreaClass}
                  value={reference.servicesProvided}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...response,
                      references: response.references.map((entry) =>
                        entry.referenceId === reference.referenceId
                          ? { ...entry, servicesProvided: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  className="sr-only"
                  id={`reference-visual-${reference.referenceId}`}
                  type="file"
                  multiple
                  accept={imageCategory?.allowedMimeTypes.join(",")}
                  disabled={
                    disabled ||
                    !canUpload ||
                    !imageCategory ||
                    reference.visualDocumentIds.length >=
                      questionnaire.references.maxVisualsPerReference
                  }
                  onChange={(event) => void uploadVisual(event.target.files)}
                />
                <label
                  htmlFor={`reference-visual-${reference.referenceId}`}
                  onClick={() => {
                    uploadForId.current = reference.referenceId;
                  }}
                  className={`inline-flex items-center gap-2 rounded-md border border-[#008ad2] px-3 py-2 text-xs font-extrabold text-[#0075b4] ${disabled || !canUpload || !imageCategory ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#eef8fd]"}`}
                >
                  <ImageUp size={14} aria-hidden="true" />
                  {uploadingId === reference.referenceId
                    ? "Uploading…"
                    : "Add event visuals"}
                </label>
                <span className="text-xs text-[#718496]">
                  {reference.visualDocumentIds.length}/
                  {questionnaire.references.maxVisualsPerReference} attached
                </span>
                <button
                  type="button"
                  disabled={disabled || hasLinkedDocuments}
                  title={
                    hasLinkedDocuments
                      ? "Retire this reference’s visuals in Document uploads first."
                      : undefined
                  }
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  onClick={() =>
                    onChange({
                      ...response,
                      references: response.references.filter(
                        (entry) => entry.referenceId !== reference.referenceId,
                      ),
                    })
                  }
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              </div>
            </fieldset>
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {response.references.length < questionnaire.references.maximumCount ? (
        <button
          type="button"
          disabled={disabled}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#008ad2] px-4 py-2.5 text-sm font-extrabold text-[#0075b4] hover:bg-[#eef8fd] disabled:opacity-50"
          onClick={() =>
            onChange({
              ...response,
              references: [
                ...response.references,
                {
                  referenceId: newId(),
                  clientName: "",
                  contact: { name: "", email: "", phone: "" },
                  eventName: "",
                  servicesProvided: "",
                  currentStatus: "",
                  comparable: false,
                  visualDocumentIds: [],
                },
              ],
            })
          }
        >
          <Plus size={15} aria-hidden="true" /> Add reference
        </button>
      ) : null}
    </WorkspaceSection>
  );
}
