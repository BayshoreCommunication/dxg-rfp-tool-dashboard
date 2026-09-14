import type { SectionId, VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import type { VendorResponseV1 } from "@/contracts/generated/vendor-response-v1";

export type VendorDraftDto = {
  draftId: string;
  draftRevision: number;
  status: "active" | "submitted" | "abandoned";
  lastSavedAt: string;
  response: VendorResponseV1;
};

export type VendorWorkspaceIssue = {
  code: string;
  path: string;
  sectionId: string;
  message: string;
};

export type SectionState = "complete" | "in_progress" | "not_started";

const words = (value: string): number => value.trim() ? value.trim().split(/\s+/u).length : 0;
const blank = (value: string | undefined): boolean => !value?.trim();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasUrl = (value: string): boolean => /(https?:\/\/|www\.)/iu.test(value);

const issue = (
  issues: VendorWorkspaceIssue[],
  sectionId: SectionId,
  path: string,
  message: string,
) => issues.push({ code: "required", path, sectionId, message });

export const applicableSections = (
  questionnaire: VendorResponseQuestionnaireV1,
  response: VendorResponseV1,
) => questionnaire.sections
  .filter((section) => section.enabled)
  .filter((section) => section.condition !== "travel_flagged"
    || response.rooms.some((room) => room.laborLines.some((line) => line.travel)))
  .sort((left, right) => left.order - right.order);

export const validateWorkspaceResponse = (
  questionnaire: VendorResponseQuestionnaireV1,
  response: VendorResponseV1,
): VendorWorkspaceIssue[] => {
  const issues: VendorWorkspaceIssue[] = [];
  if (questionnaire.identity.vendorNameRequired && blank(response.identity.vendorName)) {
    issue(issues, "compliance", "/identity/vendorName", "Vendor name is required.");
  }
  if (questionnaire.identity.submittedByRequired && blank(response.identity.submittedBy)) {
    issue(issues, "compliance", "/identity/submittedBy", "Submitter name is required.");
  }
  if (questionnaire.identity.emailRequired && blank(response.identity.email)) {
    issue(issues, "compliance", "/identity/email", "Response contact email is required.");
  } else if (!blank(response.identity.email) && !emailPattern.test(response.identity.email)) {
    issue(issues, "compliance", "/identity/email", "Enter a valid response contact email.");
  }
  for (const acknowledgement of questionnaire.acknowledgements.filter((entry) => entry.required)) {
    if (!response.acknowledgements.some((entry) => entry.acknowledgementId === acknowledgement.acknowledgementId && entry.accepted)) {
      issue(issues, "compliance", `/acknowledgements/${acknowledgement.acknowledgementId}`, `${acknowledgement.label} must be accepted.`);
    }
  }

  const profile = questionnaire.companyProfile;
  if (profile.legalNameRequired && blank(response.companyProfile.legalName)) {
    issue(issues, "company_profile", "/companyProfile/legalName", "Legal company name is required.");
  }
  if (profile.headquartersRequired && blank(response.companyProfile.headquarters)) {
    issue(issues, "company_profile", "/companyProfile/headquarters", "Headquarters location is required.");
  }
  if (profile.largestComparableEventEnabled && blank(response.companyProfile.largestComparableEvent)) {
    issue(issues, "company_profile", "/companyProfile/largestComparableEvent", "Largest comparable event is required.");
  }
  if (profile.clientMix.enabled && profile.clientMix.required) {
    const percentages = new Map(response.companyProfile.clientMix.map((entry) => [entry.categoryId, entry.percent]));
    for (const category of profile.clientMix.categories) {
      if (!percentages.has(category.categoryId)) {
        issue(issues, "company_profile", `/companyProfile/clientMix/${category.categoryId}`, `${category.label} percentage is required.`);
      }
    }
    const total = response.companyProfile.clientMix.reduce((sum, entry) => sum + entry.percent, 0);
    if (Math.abs(total - 100) > 0.000001) {
      issue(issues, "company_profile", "/companyProfile/clientMix", "Client mix percentages must total 100%.");
    }
  }

  const responseByRoom = new Map(response.rooms.map((room) => [room.roomId, room]));
  for (const room of questionnaire.rooms) {
    const answer = responseByRoom.get(room.roomId);
    if (!answer) {
      issue(issues, "rooms", `/rooms/${room.roomId}`, `${room.name} needs a response.`);
      continue;
    }
    const answersBySpec = new Map(answer.specResponses.map((entry) => [entry.specId, entry]));
    for (const spec of room.specs) {
      const specAnswer = answersBySpec.get(spec.specId);
      if (!specAnswer) {
        issue(issues, "rooms", `/rooms/${room.roomId}/specResponses/${spec.specId}`, `${room.name}: respond to ${spec.label}.`);
      } else if ((specAnswer.status === "substitute" || specAnswer.status === "exception") && blank(specAnswer.note)) {
        issue(issues, "rooms", `/rooms/${room.roomId}/specResponses/${spec.specId}/note`, `${room.name}: add a note for ${spec.label}.`);
      }
    }
    const categoryTotals = new Set(answer.categoryTotals.map((entry) => entry.categoryId));
    for (const categoryId of new Set(answer.equipmentLines.map((entry) => entry.categoryId))) {
      if (!categoryTotals.has(categoryId)) {
        issue(issues, "rooms", `/rooms/${room.roomId}/categoryTotals/${categoryId}`, `${room.name}: add a total for each used equipment category.`);
      }
    }
    if (answer.equipmentLines.some((line) => blank(line.description) || line.quantity <= 0)) {
      issue(issues, "rooms", `/rooms/${room.roomId}/equipmentLines`, `${room.name}: complete every equipment description and quantity.`);
    }
    if (room.streamingApplicable) {
      if (!answer.hybrid || blank(answer.hybrid.feedHandoff) || blank(answer.hybrid.redundancy) || blank(answer.hybrid.virtualAudienceExperience)) {
        issue(issues, "rooms", `/rooms/${room.roomId}/hybrid`, `${room.name}: complete all streaming delivery details.`);
      } else if (!questionnaire.hybrid.externalUrlsAllowed && [answer.hybrid.feedHandoff, answer.hybrid.redundancy, answer.hybrid.virtualAudienceExperience].some(hasUrl)) {
        issue(issues, "rooms", `/rooms/${room.roomId}/hybrid`, `${room.name}: remove external URLs from streaming details.`);
      }
    }
  }
  if (questionnaire.hybrid.platformPlanRequired && blank(response.platformIntegrationPlan)) {
    issue(issues, "rooms", "/platformIntegrationPlan", "Event-wide platform integration plan is required.");
  } else if (!questionnaire.hybrid.externalUrlsAllowed && hasUrl(response.platformIntegrationPlan)) {
    issue(issues, "rooms", "/platformIntegrationPlan", "Remove external URLs from the platform plan.");
  }

  for (const roleId of questionnaire.crew.requiredRoleIds) {
    if (!response.crew.some((member) => member.roleId === roleId)) {
      const label = questionnaire.crew.roles.find((role) => role.id === roleId)?.label ?? roleId;
      issue(issues, "crew", `/crew/roles/${roleId}`, `Add at least one ${label}.`);
    }
  }
  if (response.crew.some((member) => blank(member.name) || blank(member.bio) || words(member.bio) > questionnaire.crew.bioMaxWords)) {
    issue(issues, "crew", "/crew", `Complete each crew member and keep bios within ${questionnaire.crew.bioMaxWords} words.`);
  }

  const travelLines = response.rooms.flatMap((room) => room.laborLines.filter((line) => line.travel).map((line) => ({ roomId: room.roomId, line })));
  for (const { roomId, line } of travelLines) {
    const lodging = response.travel.lodgingRequests.find((entry) => entry.laborLineId === line.laborLineId && entry.roomId === roomId);
    if (!lodging || (lodging.clientProvidedRoom && (!lodging.checkIn || !lodging.checkOut))) {
      issue(issues, "travel", `/travel/lodgingRequests/${line.laborLineId}`, "Every traveling crew line needs a lodging response.");
    }
  }

  for (const fee of questionnaire.pricing.feeLines.filter((entry) => entry.required)) {
    if (!response.pricing.fees.some((entry) => entry.feeId === fee.feeId)) {
      issue(issues, "pricing", `/pricing/fees/${fee.feeId}`, `${fee.label} is required; enter 0 if waived.`);
    }
  }
  if (questionnaire.alternates.enabled && response.alternates.length < questionnaire.alternates.minimumCount) {
    issue(issues, "alternates", "/alternates", `Add at least ${questionnaire.alternates.minimumCount} alternate${questionnaire.alternates.minimumCount === 1 ? "" : "s"}.`);
  }
  if (questionnaire.references.enabled && response.references.length < questionnaire.references.minimumCount) {
    issue(issues, "references", "/references", `Add at least ${questionnaire.references.minimumCount} reference${questionnaire.references.minimumCount === 1 ? "" : "s"}.`);
  }
  for (const category of questionnaire.documents.categories) {
    const count = response.documents.filter((document) => document.purposeId === category.purposeId).length;
    if (count < category.minimumFiles) {
      issue(issues, "documents", `/documents/purpose/${category.purposeId}`, `${category.label} requires ${category.minimumFiles} file${category.minimumFiles === 1 ? "" : "s"}.`);
    }
  }
  if (questionnaire.valueAdds.enabled && questionnaire.valueAdds.required && blank(response.valueAdds)) {
    issue(issues, "value_adds", "/valueAdds", "Value adds are required.");
  }
  return issues;
};

export const sectionState = (
  sectionId: SectionId,
  response: VendorResponseV1,
  issues: VendorWorkspaceIssue[],
): SectionState => {
  if (sectionId === "review") return issues.length === 0 ? "complete" : "not_started";
  if (sectionId === "alternates" && response.alternates.length === 0) return "not_started";
  if (sectionId === "value_adds" && !response.valueAdds.trim()) return "not_started";
  if (!issues.some((entry) => entry.sectionId === sectionId)) return "complete";
  const started: Partial<Record<SectionId, boolean>> = {
    compliance: Boolean(response.identity.vendorName || response.identity.submittedBy || response.identity.email || response.acknowledgements.length),
    company_profile: Boolean(response.companyProfile.legalName || response.companyProfile.headquarters || response.companyProfile.clientMix.length),
    rooms: response.rooms.length > 0 || Boolean(response.platformIntegrationPlan),
    crew: response.crew.length > 0,
    travel: response.travel.lodgingRequests.length > 0,
    pricing: response.pricing.fees.length > 0 || response.pricing.assumptionsExclusions.length > 0,
    alternates: response.alternates.length > 0,
    references: response.references.length > 0,
    documents: response.documents.length > 0,
    value_adds: Boolean(response.valueAdds),
    review: false,
  };
  return started[sectionId] ? "in_progress" : "not_started";
};

export const workspaceTotals = (
  questionnaire: VendorResponseQuestionnaireV1,
  response: VendorResponseV1,
) => {
  const equipment = response.rooms.flatMap((room) => room.categoryTotals).reduce((sum, total) => sum + total.amount.amountMinor, 0);
  const labor = response.rooms.reduce((sum, room) => sum + room.laborSubtotal.amountMinor, 0);
  const fees = response.pricing.fees.reduce((sum, fee) => sum + fee.amount.amountMinor, 0);
  const grand = equipment + labor + response.pricing.travelSubtotal.amountMinor + fees - response.pricing.discount.amountMinor;
  const specs = response.rooms.flatMap((room) => room.specResponses);
  const totalSpecs = questionnaire.rooms.reduce((sum, room) => sum + room.specs.length, 0);
  return {
    grandMinor: grand,
    totalSpecs,
    answeredSpecs: specs.length,
    complySpecs: specs.filter((entry) => entry.status === "comply").length,
  };
};

export const formatMoney = (amountMinor: number, currency: string, precision: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amountMinor / 10 ** precision);

export const moneyInput = (amountMinor: number, precision: number): string =>
  (amountMinor / 10 ** precision).toFixed(precision);

export const moneyFromInput = (value: string, precision: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10 ** precision)) : 0;
};
