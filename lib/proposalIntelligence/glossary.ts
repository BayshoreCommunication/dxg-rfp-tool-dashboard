/**
 * Plain definitions for the words Proposal Intelligence uses.
 *
 * The audit found roughly twenty terms on these screens with no definition
 * anywhere in the product — extraction confidence, mandatory, normalized total,
 * requirement checklist — and no help link, tour or glossary to look them up in.
 * This is the one place they are defined; screens link to it rather than each
 * inventing their own tooltip.
 */
import {
  coverageLevels,
  coveragePresentation,
} from "@/lib/proposalIntelligence/coverageVocabulary";

export type GlossaryEntry = {
  /** The word as it appears on screen. */
  term: string;
  /** One or two sentences, no jargon of their own. */
  definition: string;
  /** Other spellings a reader might search for. */
  aliases?: string[];
};

export type GlossaryGroup = { heading: string; entries: GlossaryEntry[] };

/** The coverage labels are generated so they can never drift from the chips. */
const coverageEntries: GlossaryEntry[] = coverageLevels.map((level) => ({
  term: coveragePresentation[level].label,
  definition: coveragePresentation[level].description,
}));

export const glossary: GlossaryGroup[] = [
  {
    heading: "The basics",
    entries: [
      {
        term: "Proposal Intelligence",
        definition:
          "Where you compare the responses vendors sent you. RFPilot reads each one, checks it against the requirements you approved, and shows them side by side with every claim linked back to the vendor's own words. It is not the chat assistant.",
      },
      {
        term: "Requirement checklist",
        definition:
          "The list of requirements every vendor is judged against. You approve it once, and it locks so the list cannot change halfway through a comparison. Each revision gets a version number.",
        aliases: ["requirement registry", "approved requirements", "registry"],
      },
      {
        term: "Comparison",
        definition:
          "One run that lines your vendors up against the approved checklist. Each run is saved exactly as it was, so older results stay readable even after requirements or responses change.",
      },
      {
        term: "Vendor response",
        definition:
          "Everything one vendor sent you for a proposal — their message and any attached documents. If they send an update, it is kept as a new version and the old one stays readable.",
        aliases: ["response", "submission", "version"],
      },
    ],
  },
  {
    heading: "How answers are described",
    entries: coverageEntries,
  },
  {
    heading: "Requirements and risk",
    entries: [
      {
        term: "Must-have requirement",
        definition:
          "A requirement you marked as essential. RFPilot flags it when a vendor does not answer it, but it does not rule the vendor out for you — that is your call.",
        aliases: ["mandatory", "non-negotiable"],
      },
      {
        term: "Must-pass requirement",
        definition:
          "Stricter than a must-have. A vendor that misses one is excluded from the ranking automatically.",
        aliases: ["eligibility", "eligible"],
      },
      {
        term: "Gap",
        definition:
          "A must-have requirement the vendor never answers. Different from a partial answer, which is a flag to review rather than a gap.",
      },
      {
        term: "High-severity concern",
        definition:
          "Something RFPilot thinks is worth raising with the vendor before you award — usually a must-have that is unanswered or only partly answered. It is a prompt to ask, not a disqualification.",
        aliases: ["risk", "high risk"],
      },
    ],
  },
  {
    heading: "Evidence and scoring",
    entries: [
      {
        term: "Cited evidence",
        definition:
          "The vendor's own words behind an answer. Opening it shows the lines of their document that answer the requirement, with the matching words marked, and the full page one click away.",
        aliases: ["citation", "quote", "source"],
      },
      {
        term: "Confidence",
        definition:
          "How sure RFPilot is that it read the document correctly. It is not a score, and it says nothing about how good the vendor is.",
        aliases: ["extraction confidence"],
      },
      {
        term: "Partly readable",
        definition:
          "RFPilot could not read some of a vendor's file — usually a scanned page with no text behind it. Ask the vendor for a text-based copy, or add their figures yourself.",
        aliases: ["unreadable", "sources readable", "OCR"],
      },
      {
        term: "RFPilot starting score",
        definition:
          "A score RFPilot worked out from the cited evidence, used where you have not scored a criterion yourself. It is a starting point, not a judgement — your own score replaces it.",
        aliases: ["automated score", "baseline"],
      },
      {
        term: "Weight",
        definition:
          "How much a criterion counts toward the total, as a percentage. Pricing at 30% moves the total three times as much as something at 10%.",
      },
      {
        term: "Submitted total",
        definition:
          "The price exactly as the vendor stated it, unchanged.",
      },
      {
        term: "Comparable total",
        definition:
          "The same price after RFPilot adjusts for anything that would make a straight comparison unfair, such as a different currency. When nothing needed adjusting it matches the submitted total.",
        aliases: ["normalized total"],
      },
    ],
  },
  {
    heading: "Deciding",
    entries: [
      {
        term: "Suggested shortlist",
        definition:
          "RFPilot's suggestion of the strongest fit, drawn from what the vendors wrote. It is advice, not a decision.",
        aliases: ["recommendation", "advisory ranking"],
      },
      {
        term: "Recorded decision",
        definition:
          "The choice you save on the comparison's Evaluation tab, with your reasoning. This is the official outcome and it is kept permanently with the comparison.",
        aliases: ["shortlist", "selection", "no award"],
      },
      {
        term: "Out of date",
        definition:
          "The proposal, its requirements, or the responses changed after this comparison ran. The saved result stays readable; run a new comparison for an up-to-date view.",
        aliases: ["stale"],
      },
    ],
  },
];

export const glossaryTermCount = glossary.reduce(
  (total, group) => total + group.entries.length,
  0,
);

/** Case-insensitive search across terms, aliases and definitions. */
export const searchGlossary = (query: string): GlossaryGroup[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return glossary;
  return glossary
    .map((group) => ({
      heading: group.heading,
      entries: group.entries.filter((entry) =>
        [entry.term, entry.definition, ...(entry.aliases ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      ),
    }))
    .filter((group) => group.entries.length > 0);
};
