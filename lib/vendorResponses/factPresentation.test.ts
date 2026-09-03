import type { ExtractedFact } from "@/app/actions/vendorIntelligence";
import { describeFactType, familyLabel, groupFacts, isSystemEntry } from "./factPresentation";

const fact = (overrides: Partial<ExtractedFact>): ExtractedFact => ({
  factId: overrides.factKey ?? "fact",
  factKey: "key",
  family: "commercial",
  factType: "commercial_component",
  statement: "The vendor states a value.",
  valueKind: "text",
  typedValue: {},
  normalizedValue: "value",
  unit: null,
  currency: null,
  explicitness: "explicit",
  confidence: 0.9,
  contradictionGroup: null,
  citations: [],
  ...overrides,
});

it("names families and types in words, with a humanised fallback", () => {
  expect(familyLabel("assumption_exception_dependency")).toBe("Assumptions and exceptions");
  expect(familyLabel("hybrid_streaming_recording")).toBe("Streaming and recording");
  expect(familyLabel("sustainability_dei")).toBe("Sustainability and DEI");
  expect(familyLabel("brand_new_family")).toBe("Brand new family");
  expect(describeFactType("commercial_total")).toBe("Total price");
  expect(describeFactType("strike_schedule")).toBe("Teardown schedule");
  expect(describeFactType("something_else")).toBe("Something else");
});

it("sets aside form metadata and identifiers without dropping real values", () => {
  expect(isSystemEntry(fact({ factKey: "cara_v_james_ip_address", normalizedValue: "216.59.102.34", statement: "A form entry lists the IP address 216.59.102.34." }))).toBe(true);
  expect(isSystemEntry(fact({ factKey: "cara_v_james_date", normalizedValue: "29 April 2025 11:24 AM", statement: "A form entry is dated 29 April 2025 11:24 AM." }))).toBe(true);
  expect(isSystemEntry(fact({ factKey: "customer_order_number", normalizedValue: "0061523", statement: "The quote/order number is 0061523." }))).toBe(true);
  expect(isSystemEntry(fact({ factKey: "cara_v_james_email", normalizedValue: "cvjames@gih.org", statement: "The contact email is cvjames@gih.org." }))).toBe(true);
  expect(isSystemEntry(fact({ factKey: "proposal_validity_no_data", normalizedValue: "", statement: "No validity period was stated." }))).toBe(true);
  expect(isSystemEntry(fact({ factKey: "total_pricing", normalizedValue: "USD 207055", statement: "The proposal total is $207,055.00." }))).toBe(false);
  expect(isSystemEntry(fact({ factKey: "company_location", normalizedValue: "Tampa, FL", statement: "DXG's headquarters is in Tampa, FL." }))).toBe(false);
  expect(isSystemEntry(fact({ factKey: "accessibility_commitment", normalizedValue: "false", statement: "No accessibility commitment is stated." }))).toBe(false);
});

it("groups values under headings in reading order, totals first, and keeps system entries apart", () => {
  const { groups, systemEntries } = groupFacts([
    fact({ factKey: "dei", family: "sustainability_dei", factType: "dei_commitment", normalizedValue: "committed to DEI" }),
    fact({ factKey: "ip", family: "company_profile", factType: "policy_statement", normalizedValue: "216.59.102.34" }),
    fact({ factKey: "labor", family: "commercial", factType: "commercial_component", normalizedValue: "USD 81275", confidence: 0.99 }),
    fact({ factKey: "total", family: "commercial", factType: "commercial_total", normalizedValue: "USD 207055", confidence: 0.9 }),
    fact({ factKey: "venue", family: "schedule_logistics", factType: "logistics_plan", normalizedValue: "Hyatt Regency New Orleans" }),
    fact({ factKey: "ace", family: "staffing", factType: "named_staff", normalizedValue: "Wallace Johnson" }),
  ]);
  expect(groups.map((group) => group.label)).toEqual(["Price and terms", "Schedule and logistics", "Team", "Sustainability and DEI"]);
  expect(groups[0].facts.map((item) => item.factKey)).toEqual(["total", "labor"]);
  expect(systemEntries.map((item) => item.factKey)).toEqual(["ip"]);
});

it("leads with the confirmed total, then the larger of several stated totals", () => {
  const totals = [
    fact({ factKey: "equipment", family: "commercial", factType: "commercial_total", normalizedValue: "USD 100180", confidence: 0.99 }),
    fact({ factKey: "proposal", family: "commercial", factType: "commercial_total", normalizedValue: "USD 207055", confidence: 0.9 }),
    fact({ factKey: "labor", family: "commercial", factType: "commercial_total", normalizedValue: "USD 81275", confidence: 0.99 }),
  ];
  expect(groupFacts(totals).groups[0].facts.map((item) => item.factKey)).toEqual(["proposal", "equipment", "labor"]);
  expect(groupFacts(totals, new Set(["labor"])).groups[0].facts.map((item) => item.factKey)).toEqual(["labor", "proposal", "equipment"]);
});
