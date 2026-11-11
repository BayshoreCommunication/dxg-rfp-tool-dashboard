import { expect, type Locator } from "@playwright/test";
import { RFP_NOUN } from "../../test/wording";

// The user-facing noun is "proposal": on-screen text must not call the document a planner writes
// an "RFP". "RFPilot" is the product name and passes. `allowed` lists exact phrases a screen may
// still show, each with a reason where it is passed (text the backend sends, for example).
export const expectProposalWording = async (region: Locator, allowed: readonly string[] = []) => {
  const text = allowed.reduce((rest, phrase) => rest.replaceAll(phrase, " "), (await region.textContent()) ?? "");
  const found = text.match(new RegExp(`.{0,40}${RFP_NOUN.source}.{0,40}`));
  expect(found?.[0] ?? null, 'on-screen text says "proposal", not "RFP"').toBeNull();
};
