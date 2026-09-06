/**
 * How extracted vendor facts are named, ordered and filtered for people.
 *
 * The intelligence layer returns facts as one flat list with enum families and
 * types ("assumption_exception_dependency", "hybrid_streaming_recording") plus
 * anything it could read off a form: IP addresses, order numbers, timestamps.
 * Shown raw, the useful figures (totals, dates, venue, team) were buried in a
 * fifty-item dump and the obviously meaningless entries made the right ones
 * look suspect. This groups facts under plain headings in a business order,
 * names each type in words, and sets aside system entries so nothing is lost
 * but nothing meaningless leads.
 */
import type { ExtractedFact } from "@/app/actions/vendorIntelligence";
import { parseMoney } from "@/lib/vendorResponses/money";

export const readable = (value: string) =>
  value.replaceAll("_", " ").trim().replace(/^./, (letter) => letter.toUpperCase());

/** Family → heading, in the order a buyer reads them. */
export const familyPresentation: Array<{ family: string; label: string }> = [
  { family: "commercial", label: "Price and terms" },
  { family: "schedule_logistics", label: "Schedule and logistics" },
  { family: "staffing", label: "Team" },
  { family: "equipment", label: "Equipment" },
  { family: "hybrid_streaming_recording", label: "Streaming and recording" },
  { family: "experience", label: "Experience" },
  { family: "references", label: "References" },
  { family: "company_profile", label: "Company" },
  { family: "assumption_exception_dependency", label: "Assumptions and exceptions" },
  { family: "alternative", label: "Alternatives the vendor suggests" },
  { family: "insurance_policy", label: "Insurance" },
  { family: "accessibility", label: "Accessibility" },
  { family: "sustainability_dei", label: "Sustainability and DEI" },
];

const familyIndex = new Map(familyPresentation.map((item, index) => [item.family, index]));

export const familyLabel = (family: string) =>
  familyPresentation.find((item) => item.family === family)?.label ?? readable(family);

export const factTypeLabel: Record<string, string> = {
  commercial_total: "Total price",
  commercial_component: "Price line",
  commercial_exclusion: "Not included in the price",
  commercial_option: "Option",
  payment_term: "Payment terms",
  cancellation_term: "Cancellation terms",
  proposal_validity: "Quote valid until",
  policy_statement: "Policy",
  assumption: "Assumption",
  exception: "Exception",
  dependency: "Depends on",
  alternative: "Alternative offered",
  company_name: "Company name",
  organization_size: "Company size",
  years_in_business: "In business since",
  named_staff: "Named staff",
  staff_count: "Staffing",
  staff_role: "Roles",
  equipment_item: "Equipment",
  equipment_system: "Equipment package",
  setup_schedule: "Setup schedule",
  strike_schedule: "Teardown schedule",
  logistics_plan: "Logistics",
  hybrid_capability: "Hybrid capability",
  recording_capability: "Recording capability",
  relevant_project: "Relevant project",
  technical_approach: "Technical approach",
  insurance_coverage: "Insurance",
  accessibility_commitment: "Accessibility",
  dei_commitment: "DEI commitment",
};

export const describeFactType = (factType: string) => factTypeLabel[factType] ?? readable(factType);

/** Within a family, the figures a buyer looks for first. */
const typePriority: Record<string, number> = {
  commercial_total: 0,
  proposal_validity: 1,
  payment_term: 2,
  cancellation_term: 3,
  commercial_exclusion: 4,
  commercial_component: 5,
  setup_schedule: 0,
  strike_schedule: 1,
  logistics_plan: 2,
  company_name: 0,
  organization_size: 1,
  years_in_business: 2,
};

const IP_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;
const SYSTEM_KEY = /(_|^)(ip_address|ip|email|phone|signature|order_number|customer_number|revision_number|tracking|user_agent|session)(_|$)/i;
const FORM_ENTRY = /\b(form entry|form submission|submitted the form|ip address|order number|customer number|revision number)\b/i;

/**
 * Entries with no business meaning: form metadata, contact details and
 * identifiers the extractor picked up off an order form. They are kept but
 * listed separately, never among the values a buyer compares.
 */
export const isSystemEntry = (fact: Pick<ExtractedFact, "factKey" | "normalizedValue" | "statement">) => {
  const value = fact.normalizedValue.trim();
  if (!value) return true;
  if (IP_ADDRESS.test(value)) return true;
  if (SYSTEM_KEY.test(fact.factKey)) return true;
  if (FORM_ENTRY.test(fact.statement)) return true;
  return false;
};

export type FactGroup = { family: string; label: string; facts: ExtractedFact[] };

const moneyAmount = (fact: ExtractedFact) => parseMoney(fact.normalizedValue)?.amount ?? null;

/**
 * Facts a buyer compares, grouped under plain headings in reading order;
 * system entries set aside. `confirmedFactIds` (accepted or corrected by the
 * planner) lead their group; among totals, the larger figure leads, since a
 * grand total is larger than any of its parts.
 */
export const groupFacts = (facts: ExtractedFact[], confirmedFactIds: ReadonlySet<string> = new Set()): { groups: FactGroup[]; systemEntries: ExtractedFact[] } => {
  const systemEntries = facts.filter(isSystemEntry);
  const meaningful = facts.filter((fact) => !isSystemEntry(fact));
  const byFamily = new Map<string, ExtractedFact[]>();
  meaningful.forEach((fact) => byFamily.set(fact.family, [...(byFamily.get(fact.family) ?? []), fact]));
  const groups = [...byFamily.entries()]
    .sort(([left], [right]) => (familyIndex.get(left) ?? 99) - (familyIndex.get(right) ?? 99) || left.localeCompare(right))
    .map(([family, items]) => ({
      family,
      label: familyLabel(family),
      facts: [...items].sort((left, right) =>
        Number(confirmedFactIds.has(right.factId)) - Number(confirmedFactIds.has(left.factId))
        || (typePriority[left.factType] ?? 50) - (typePriority[right.factType] ?? 50)
        || (left.factType === "commercial_total" && right.factType === "commercial_total" ? (moneyAmount(right) ?? 0) - (moneyAmount(left) ?? 0) : 0)
        || right.confidence - left.confidence,
      ),
    }));
  return { groups, systemEntries };
};
