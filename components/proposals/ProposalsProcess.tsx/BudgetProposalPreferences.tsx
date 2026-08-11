"use client";

import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import GlobalDateInput from "@/components/shared/GlobalDateInput";
import GlobalSelect from "@/components/shared/GlobalSelect";
import type { BudgetData, ProposalSettings } from "../AddNewProposal";
import {
  procurementTimelineDateBounds,
  procurementTimelineIssues,
  type ProcurementTimelineDateField,
  type ProposalExperienceMode,
} from "@/lib/proposals/proposalExperience";
import { InfoTooltip, toggleItem } from "./shared";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

type DatePickerFormat = "dd-MM-yyyy" | "yyyy-MM-dd" | "MM-dd-yyyy";

const toPickerFormat = (displayFormat: string): DatePickerFormat => {
  const format = (displayFormat || "MM/DD/YYYY").replaceAll("_", "-").toUpperCase();
  if (format === "DD/MM/YYYY" || format === "DD-MM-YYYY") return "dd-MM-yyyy";
  if (format === "YYYY/MM/DD" || format === "YYYY-MM-DD") return "yyyy-MM-dd";
  return "MM-dd-yyyy";
};

const fromIsoToDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const fromDateToIso = (value: Date | null) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* ─── Yes/No buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    <button type="button" aria-pressed={value === "YES"} className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" aria-pressed={value === "NO"} className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#f0f0f0] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Select field ─── */
const SelectField = ({
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
}) => (
  <GlobalSelect
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`${inputClass} ${hasError && !value ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </GlobalSelect>
);

/* ─── Budget tier cards ─── */
const BUDGET_TIERS = [
  { value: "Essential",          range: "$10K – $25K",   producerCall: false },
  { value: "Standard",           range: "$25K – $50K",   producerCall: false },
  { value: "Production",         range: "$50K – $100K",  producerCall: false },
  { value: "Premium",            range: "$100K – $250K", producerCall: true  },
  { value: "Enterprise",         range: "$250K – $500K", producerCall: true  },
  { value: "Signature",          range: "$500K+",        producerCall: true  },
  { value: "Not Yet Determined", range: "Need Guidance", producerCall: true  },
] as const;

const tierCardCls = (val: string, selected: string): string => {
  const base =
    "relative flex flex-col rounded-xl border-2 px-3 py-3 cursor-pointer transition-all select-none text-left";
  if (selected === val) return `${base} border-[#1DBFD3] bg-[#1DBFD3]/5`;
  return `${base} border-[#e4e4e4] bg-white hover:border-[#1DBFD3]/40`;
};

/* ─── Budget flexibility pills ─── */
const FLEXIBILITY_OPTIONS = [
  "Fixed",
  "Flexible",
  "Value-Engineering Welcome",
  "Not Sure",
] as const;

const flexPillCls = (opt: string, selected: string): string => {
  const base =
    "rounded-full border px-4 py-1.5 text-xs font-semibold cursor-pointer transition-all";
  if (selected === opt)
    return `${base} border-[#1DBFD3] bg-[#1DBFD3]/10 text-[#222628]`;
  return `${base} border-[#e4e4e4] bg-white text-slate-500 hover:border-slate-300`;
};

/* ─── Proposal format options ─── */
type SuggestKey = "scenic" | "ledwall" | "enterprise";

const FORMAT_OPTIONS: {
  label: string;
  desc: string;
  alwaysDefault?: boolean;
  suggestIf?: SuggestKey;
}[] = [
  {
    label: "Itemized Gear List",
    desc: "Line-item equipment list with quantities.",
    alwaysDefault: true,
  },
  {
    label: "Labor Breakdown",
    desc: "All crew positions with call times and overtime assumptions clearly stated.",
    alwaysDefault: true,
  },
  {
    label: "All-In Total Estimate",
    desc: "Single consolidated total inclusive of gear, labor, freight, expendables, and any other costs.",
    alwaysDefault: true,
  },
  {
    label: "Alternate / Value-Engineered Option",
    desc: "Provide at least one alternate/value-engineered option with scope tradeoffs clearly explained.",
  },
  {
    label: "Creative / Scenic Approach Narrative",
    desc: "Describe your creative and scenic design approach, referencing comparable events.",
    suggestIf: "scenic",
  },
  {
    label: "Crew Bios",
    desc: "Leadership and management crew bios and venue experience preferred.",
    suggestIf: "enterprise",
  },
  {
    label: "References",
    desc: "Minimum two references from comparable events at this venue type.",
    suggestIf: "enterprise",
  },
  {
    label: "LED Wall Line-Itemed Separately",
    desc: "LED wall must be line-itemed separately from the main gear package.",
    suggestIf: "ledwall",
  },
];

const formatCardCls = (checked: boolean): string => {
  const base =
    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer";
  if (checked) return `${base} border-[#1DBFD3] bg-[#1DBFD3]/5`;
  return `${base} border-[#e4e4e4] bg-white hover:border-slate-300`;
};

const formatCheckCls = (checked: boolean): string => {
  const base =
    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all";
  if (checked) return `${base} border-[#1DBFD3] bg-[#1DBFD3]`;
  return `${base} border-[#e4e4e4]`;
};

/* ─── Evaluation matrix criteria ─── */
type MK = keyof BudgetData["evaluationMatrix"];

const MATRIX_CRITERIA: {
  key: MK;
  label: string;
  guide: string;
  condition?: "hybrid" | "scenic";
  allowZero?: boolean;
}[] = [
  {
    key: "technicalApproach",
    label: "Technical Approach",
    guide: "Spec compliance",
  },
  {
    key: "crewExperience",
    label: "Crew Experience & References",
    guide: "Bios and Experience with similar scale events",
  },
  {
    key: "hybridVirtual",
    label: "Hybrid / Virtual Production Capability",
    guide: "Platform integration, virtual producer, stream quality",
    condition: "hybrid",
  },
  {
    key: "pricing",
    label: "Pricing & Value",
    guide: "Competitiveness, transparency, alternate options",
  },
  {
    key: "creativeScenic",
    label: "Creative & Scenic Design Capability",
    guide: "Portfolio, LED aesthetic, scenic vision",
    condition: "scenic",
  },
  {
    key: "responsiveness",
    label: "Responsiveness & Communication",
    guide: "RFP quality, questions asked, proposal clarity",
  },
  {
    key: "sustainabilityDei",
    label: "Sustainability & DEI Practices",
    guide: "Vendor policy documentation",
    allowZero: true,
  },
];

/* ─── Static options ─── */
const HEAR_OPTIONS = ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"];

/* ─── Props ─── */
interface Props {
  data: BudgetData;
  onChange: (updates: Partial<BudgetData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  eventFormat?: string;
  hasScenicOnAnyRoom?: boolean;
  hasLedWallOnAnyRoom?: boolean;
  contentServicesNeeded?: string;
  venueName?: string;
  eventStartDate?: string;
  mode?: ProposalExperienceMode;
}

const defaultEvalMatrix = () => ({
  technicalApproach: 25,
  crewExperience: 20,
  hybridVirtual: 20,
  pricing: 15,
  creativeScenic: 10,
  responsiveness: 7,
  sustainabilityDei: 3,
});

const BudgetProposalPreferences = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  eventFormat,
  hasScenicOnAnyRoom,
  hasLedWallOnAnyRoom,
  contentServicesNeeded,
  venueName,
  eventStartDate,
  mode = "advanced",
}: Props) => {
  const pickerFormat = toPickerFormat(proposalSettings.proposals.dateFormat);
  /* ─── Safe data ─── */
  const defMatrix = defaultEvalMatrix();
  const safeData: BudgetData = {
    ...data,
    estimatedAvBudget: data.estimatedAvBudget ?? "",
    budgetFlexibility: data.budgetFlexibility ?? "",
    proposalFormatPreferences: data.proposalFormatPreferences ?? [],
    evaluationMatrix: { ...defMatrix, ...(data.evaluationMatrix ?? {}) },
    evaluationMatrixConfirmed: data.evaluationMatrixConfirmed === true,
    sustainabilityDeiNotes: data.sustainabilityDeiNotes ?? "",
    vendorQuestionsDueDate: data.vendorQuestionsDueDate ?? "",
    responseToVendorQuestionsDate: data.responseToVendorQuestionsDate ?? "",
    proposalSubmissionDueDate: data.proposalSubmissionDueDate ?? "",
    shortlistNotificationDate: data.shortlistNotificationDate ?? "",
    vendorPresentationOpportunity: data.vendorPresentationOpportunity ?? "",
    vendorPresentationDate: data.vendorPresentationDate ?? "",
    vendorSelectionDate: data.vendorSelectionDate ?? "",
    decisionDate: data.decisionDate ?? "",
    competitiveBid: data.competitiveBid ?? "",
    numberOfProposals: data.numberOfProposals ?? "",
    scoringNotes: data.scoringNotes ?? "",
    callWithDxgProducer: data.callWithDxgProducer ?? "",
    howDidYouHear: data.howDidYouHear ?? "",
    howDidYouHearOther: data.howDidYouHearOther ?? "",
  };

  /* ─── Matrix active state ─── */
  const hybridVirtualActive =
    eventFormat === "Hybrid" || eventFormat === "Virtual";
  const creativeScenicActive =
    !!hasScenicOnAnyRoom || contentServicesNeeded === "YES";

  const activeKeys: MK[] = [
    "technicalApproach",
    "crewExperience",
    ...(hybridVirtualActive ? (["hybridVirtual"] as MK[]) : []),
    "pricing",
    ...(creativeScenicActive ? (["creativeScenic"] as MK[]) : []),
    "responsiveness",
    "sustainabilityDei",
  ];

  const activeSum = activeKeys.reduce(
    (s, k) => s + safeData.evaluationMatrix[k],
    0,
  );
  const matrixOk = activeSum === 100;
  const remaining = 100 - activeSum;
  const timelineIssues = procurementTimelineIssues(safeData, eventStartDate);
  const timelineError = (field: keyof BudgetData) =>
    timelineIssues.find((issue) => issue.field === field)?.message;
  const timelineBounds = (field: ProcurementTimelineDateField) =>
    procurementTimelineDateBounds(safeData, field, eventStartDate);

  /* ─── Quick-balance: proportionally scale active rows to sum to 100 ─── */
  const quickBalance = () => {
    const cur = safeData.evaluationMatrix;
    const total = activeKeys.reduce((s, k) => s + cur[k], 0);
    const newM = { ...cur };
    if (total === 0) {
      const per = Math.floor(100 / activeKeys.length);
      const rem = 100 - per * activeKeys.length;
      activeKeys.forEach((k, i) => {
        newM[k] = per + (i === 0 ? rem : 0);
      });
    } else {
      let running = 0;
      activeKeys.forEach((k, i) => {
        if (i < activeKeys.length - 1) {
          newM[k] = Math.round((cur[k] / total) * 100);
          running += newM[k];
        } else {
          newM[k] = 100 - running;
        }
      });
    }
    // Touching the weights is itself a decision about them.
    onChange({ evaluationMatrix: newM, evaluationMatrixConfirmed: true });
  };

  const updateMatrix = (key: MK, raw: string) => {
    const v = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    onChange({
      evaluationMatrix: { ...safeData.evaluationMatrix, [key]: v },
      evaluationMatrixConfirmed: true,
    });
  };

  /* ─── Budget signals ─── */
  const isProducerCallTier = ["Enterprise", "Signature", "Not Yet Determined"].includes(
    safeData.estimatedAvBudget,
  );
  const complexityCount = [
    hybridVirtualActive,
    hasScenicOnAnyRoom,
    hasLedWallOnAnyRoom,
    contentServicesNeeded === "YES",
  ].filter(Boolean).length;
  const showRealityWarning =
    !!safeData.estimatedAvBudget &&
    ((safeData.estimatedAvBudget === "Essential" && complexityCount >= 2) ||
      (safeData.estimatedAvBudget === "Standard" && complexityCount >= 3));

  /* ─── Matrix deactivation banners ─── */
  const showHybridBanner =
    !hybridVirtualActive && safeData.evaluationMatrix.hybridVirtual > 0;
  const showScenicBanner =
    !creativeScenicActive && safeData.evaluationMatrix.creativeScenic > 0;

  /* ─── Format "Suggested" badge logic ─── */
  const isEnterprise = ["Enterprise", "Signature"].includes(safeData.estimatedAvBudget);
  const isSuggested = (opt: (typeof FORMAT_OPTIONS)[number]): boolean => {
    if (safeData.proposalFormatPreferences.includes(opt.label)) return false;
    if (!opt.suggestIf) return false;
    if (opt.suggestIf === "scenic" && hasScenicOnAnyRoom) return true;
    if (opt.suggestIf === "ledwall" && hasLedWallOnAnyRoom) return true;
    if (opt.suggestIf === "enterprise" && isEnterprise) return true;
    return false;
  };

  /* ─── Auto-added format items (generated, not selectable) ─── */
  const autoAddedFormats: { label: string; desc: string }[] = [
    ...(hybridVirtualActive
      ? [
          {
            label: "Hybrid Production Plan",
            desc: "Narrative describing your approach to the virtual broadcast, platform integration, and virtual audience experience.",
          },
        ]
      : []),
    ...(hasScenicOnAnyRoom || hasLedWallOnAnyRoom
      ? [
          {
            label: "Scenic / LED Approach",
            desc: `Describe your experience with LED and scenic design at ${venueName || "this venue"} or comparable venues.`,
          },
        ]
      : []),
  ];

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <h2 className="text-[22px] font-bold text-[#222628]">
          {mode === "basic" ? "Investment & Timeline" : "Investment & Evaluation"}
        </h2>
        <p className="mt-1 text-sm text-[#969798]">
          {mode === "basic"
            ? "Confirm a planning budget and a realistic procurement timeline."
            : "Investment tier, evaluation matrix, proposal format requirements, and procurement timeline."}
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ════════════════════════════════════════
            BLOCK A — Investment Selection
        ════════════════════════════════════════ */}
        <Group label="Investment Selection" />

        {/* Field 1 — Budget Tier Cards */}
        <div className="mb-6">
          <label className={labelClass}>
            Estimated AV Budget Range <span className="text-red-500">*</span>
            <InfoTooltip text="Select the range that best represents your total AV and production budget across all rooms, all days — including gear, labor, freight, and expendables. If unsure, select 'Not Yet Determined' and we'll help establish a realistic range." />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BUDGET_TIERS.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => onChange({ estimatedAvBudget: tier.value })}
                aria-pressed={safeData.estimatedAvBudget === tier.value}
                className={tierCardCls(tier.value, safeData.estimatedAvBudget)}
              >
                {tier.producerCall && (
                  <span className="mb-1.5 self-start rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600">
                    ★ Producer Call
                  </span>
                )}
                <span className="text-sm font-bold leading-tight text-[#222628]">
                  {tier.value}
                </span>
                <span className="mt-0.5 text-xs text-slate-500">{tier.range}</span>
                {safeData.estimatedAvBudget === tier.value && (
                  <span className="absolute right-2 top-2 text-xs font-bold text-[#1DBFD3]">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {showErrors && !safeData.estimatedAvBudget && (
            <p className={errorClass}>Budget tier is required.</p>
          )}

          {/* Budget Reality Engine warning */}
          {showRealityWarning && (
            <div className="mt-3 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">
                <strong>Budget Reality Check:</strong> Your event includes multiple high-complexity
                elements that typically exceed the{" "}
                <strong>{safeData.estimatedAvBudget}</strong> tier. Vendors may decline to bid or
                submit inflated proposals. Consider selecting a higher tier or contacting your DXG
                producer.
              </p>
            </div>
          )}

          {/* Producer Insight Call banner */}
          {isProducerCallTier && (
            <div className="mt-3 flex gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-sm text-violet-500">★</span>
              <div>
                <p className="text-sm font-bold text-violet-800">
                  Producer Insight Call Recommended
                </p>
                <p className="mt-0.5 text-xs text-violet-700">
                  At the <strong>{safeData.estimatedAvBudget}</strong> tier, a brief discovery call
                  with your DXG producer helps scope accurately and speeds up your proposal.{" "}
                  <a href="#" className="font-semibold underline">
                    Schedule a call
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Field 2 — Investment Flexibility */}
        <div className="mb-6">
          <label className={labelClass}>
            Investment Flexibility
            <InfoTooltip text="How firm is this budget? This signals to vendors whether to submit their best scope or most cost-effective option. 'Value-Engineering Welcome' tells vendors you want creative alternatives that optimize cost without sacrificing impact." />
          </label>
          <div className="flex flex-wrap gap-2">
            {FLEXIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ budgetFlexibility: opt })}
                aria-pressed={safeData.budgetFlexibility === opt}
                className={flexPillCls(opt, safeData.budgetFlexibility)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {mode === "advanced" && <>
        {/* ════════════════════════════════════════
            BLOCK B — Proposal Format Requirements
        ════════════════════════════════════════ */}
        <Group label="Proposal Format Requirements" />

        <div className="mb-6">
          <label className={labelClass}>
            Proposal Format Requested <span className="text-red-500">*</span>
            <InfoTooltip text="Select everything you want included in vendor proposals. At least one selection is required. 'Itemized Gear List' + 'All-In Total' together give you the most flexibility to compare vendors." />
          </label>

          <div className="space-y-2">
            {FORMAT_OPTIONS.map((opt) => {
              const checked = safeData.proposalFormatPreferences.includes(opt.label);
              const suggested = isSuggested(opt);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      proposalFormatPreferences: toggleItem(
                        safeData.proposalFormatPreferences,
                        opt.label,
                      ),
                    })
                  }
                  aria-pressed={checked}
                  className={formatCardCls(checked)}
                >
                  <span className={formatCheckCls(checked)}>
                    {checked && (
                      <span className="text-[10px] font-bold text-white">✓</span>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#222628]">
                        {opt.label}
                      </span>
                      {suggested && (
                        <span className="rounded-full bg-[#1DBFD3]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1DBFD3]">
                          Suggested
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{opt.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Auto-added items (read-only) */}
          {autoAddedFormats.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Auto-added based on your event profile
              </p>
              <div className="space-y-2">
                {autoAddedFormats.map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-xs text-[#1DBFD3]">⚡</span>
                    <div>
                      <span className="text-xs font-semibold text-[#222628]">{f.label}</span>
                      <span className="ml-1 text-xs text-slate-500">— {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showErrors && safeData.proposalFormatPreferences.length === 0 && (
            <p className={errorClass}>Select at least one proposal format.</p>
          )}
        </div>

        {/* ════════════════════════════════════════
            BLOCK C — Weighted Evaluation Matrix
        ════════════════════════════════════════ */}
        <Group label="Weighted Evaluation Matrix" />

        <p className="mb-4 text-xs text-slate-500">
          Criteria weights must total exactly 100%. Conditional rows activate based on your event
          profile. Use <strong>Auto-balance</strong> to distribute any remainder automatically.
        </p>

        {/* Deactivation banners */}
        {showHybridBanner && (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Hybrid / Virtual Capability Deactivated
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                This criterion ({safeData.evaluationMatrix.hybridVirtual}%) has been removed
                because your event is In-Person Only. Use auto-balance to redistribute this weight
                to active criteria.
              </p>
            </div>
          </div>
        )}
        {showScenicBanner && (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">
                Creative &amp; Scenic Design Deactivated
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                This criterion ({safeData.evaluationMatrix.creativeScenic}%) has been removed
                because no scenic design or content services are in scope. Use auto-balance to
                redistribute this weight to active criteria.
              </p>
            </div>
          </div>
        )}

        {/* Vendors are scored on these weights, so the shipped defaults must be
            a starting point the planner accepts, not a silent decision that
            reaches the RFP as though they had chosen it. */}
        {!safeData.evaluationMatrixConfirmed && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              These are DXG&apos;s suggested weightings — not yet your choice.
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Vendors are scored against them, so they stay out of the RFP until you accept or adjust
              them. Change any weight to make it yours, or confirm the suggestion as it stands.
            </p>
            <button
              type="button"
              onClick={() => onChange({ evaluationMatrixConfirmed: true })}
              className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              Use these weightings
            </button>
          </div>
        )}
        {safeData.evaluationMatrixConfirmed && (
          <p className="mb-3 px-1 text-xs font-semibold text-emerald-700">
            ✓ Weightings confirmed — these will be published to vendors.
          </p>
        )}

        {/* Matrix table */}
        <div className="mb-3 overflow-hidden rounded-xl border border-[#e4e4e4]">
          <div className="grid grid-cols-[1fr_90px] border-b border-[#e4e4e4] bg-[#fbfbfb] px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Criterion &amp; Scoring Guide
            </span>
            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Weight
            </span>
          </div>

          {MATRIX_CRITERIA.map((crit) => {
            const isActive =
              !crit.condition ||
              (crit.condition === "hybrid" && hybridVirtualActive) ||
              (crit.condition === "scenic" && creativeScenicActive);
            if (!isActive) return null;

            const guide = crit.guide;

            const w = safeData.evaluationMatrix[crit.key];
            const warnZero = !crit.allowZero && w === 0 && showErrors;

            return (
              <div
                key={crit.key}
                className="grid grid-cols-[1fr_90px] items-center border-b border-[#f0f0f0] px-4 py-3 last:border-0"
              >
                <div>
                  <span className="block text-sm font-semibold text-[#222628]">
                    {crit.label}
                  </span>
                  <span className="block text-xs italic text-slate-400">{guide}</span>
                  {warnZero && (
                    <span className="block text-[10px] text-red-500">
                      Weight cannot be 0 for this criterion.
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={w}
                    onChange={(e) => updateMatrix(crit.key, e.target.value)}
                    className={`w-14 rounded-lg border px-2 py-1.5 text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20 ${
                      warnZero
                        ? "border-red-400 focus:border-red-400"
                        : "border-[#e4e4e4] focus:border-[#1DBFD3]"
                    }`}
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sum counter + Quick-balance */}
        <div className="mb-6 flex flex-wrap items-center gap-3 px-1">
          <div
            className={`flex items-center gap-2 text-sm font-bold ${
              matrixOk ? "text-emerald-600" : "text-red-500"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                matrixOk ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            Total: {activeSum}% / 100%
            {!matrixOk && (
              <span className="text-xs font-normal text-slate-500">
                {remaining > 0
                  ? `(${remaining}% unallocated)`
                  : `(${Math.abs(remaining)}% over)`}
              </span>
            )}
          </div>
          {!matrixOk && (
            <button
              type="button"
              onClick={quickBalance}
              className="ml-auto rounded-lg border border-[#1DBFD3] px-3 py-1.5 text-xs font-semibold text-[#1DBFD3] transition-colors hover:bg-[#1DBFD3]/5"
            >
              Auto-balance {remaining > 0 ? `+${remaining}%` : `${remaining}%`}
            </button>
          )}
          {showErrors && !matrixOk && (
            <p className="w-full text-xs text-red-500">
              Weights must total exactly 100% before your RFP can be generated. Current total:{" "}
              {activeSum}%.
            </p>
          )}
        </div>

        {/* Sustainability & DEI Practices */}
        <div className="mb-6">
          <label className={labelClass}>
            Sustainability &amp; DEI Practices
            <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
            <InfoTooltip text="Describe any sustainability or DEI (diversity, equity, and inclusion) requirements or preferences vendors should address in their proposal." />
          </label>
          <textarea
            rows={3}
            value={safeData.sustainabilityDeiNotes}
            onChange={(e) => onChange({ sustainabilityDeiNotes: e.target.value })}
            placeholder="e.g. Preference for vendors with documented sustainability practices (equipment lifecycle, waste reduction) and a supplier diversity program…"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Scoring Notes */}
        <div className="mb-6">
          <label className={labelClass}>
            Scoring Notes / Key Decision Factors
            <InfoTooltip text="Any additional context about how proposals will be evaluated — scoring rubrics, weighting rationale, or special requirements not captured in the matrix above." />
          </label>
          <textarea
            rows={3}
            value={safeData.scoringNotes}
            onChange={(e) => onChange({ scoringNotes: e.target.value })}
            placeholder="e.g. Creative vision accounts for 30% because this is a brand-defining event — we want to see bold ideas…"
            className={`${inputClass} resize-none`}
          />
        </div>

        </>}

        {/* ════════════════════════════════════════
            BLOCK D — Procurement Timeline
        ════════════════════════════════════════ */}
        <Group label="Procurement Timeline" />

        {/* Vendor Questions Due + Response to Vendor Questions */}
        <div className="mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Vendor Questions Due <span className="text-red-500">*</span>
              <InfoTooltip text="The deadline for vendors to submit clarifying questions about the RFP." />
            </label>
            <GlobalDateInput
              id="vendorQuestionsDueDate"
              label="Vendor Questions Due"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.vendorQuestionsDueDate)}
              onChange={(value) => onChange({ vendorQuestionsDueDate: fromDateToIso(value) })}
              {...timelineBounds("vendorQuestionsDueDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.vendorQuestionsDueDate) || timelineError("vendorQuestionsDueDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
            {showErrors && !safeData.vendorQuestionsDueDate && (
              <p className={errorClass}>Required.</p>
            )}
            {timelineError("vendorQuestionsDueDate") && <p className={errorClass}>{timelineError("vendorQuestionsDueDate")}</p>}
          </div>
          <div>
            <label className={labelClass}>
              Response to Vendor Questions <span className="text-red-500">*</span>
              <InfoTooltip text="The date by which you'll respond to vendor questions submitted above." />
            </label>
            <GlobalDateInput
              id="responseToVendorQuestionsDate"
              label="Response to Vendor Questions"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.responseToVendorQuestionsDate)}
              onChange={(value) => onChange({ responseToVendorQuestionsDate: fromDateToIso(value) })}
              {...timelineBounds("responseToVendorQuestionsDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.responseToVendorQuestionsDate) || timelineError("responseToVendorQuestionsDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
            {showErrors && !safeData.responseToVendorQuestionsDate && (
              <p className={errorClass}>Required.</p>
            )}
            {timelineError("responseToVendorQuestionsDate") && <p className={errorClass}>{timelineError("responseToVendorQuestionsDate")}</p>}
          </div>
        </div>

        {/* Proposal Submission Due + Shortlist Notification */}
        <div className="mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Proposal Submission Due <span className="text-red-500">*</span>
              <InfoTooltip text="The deadline for vendors to submit their completed proposals." />
            </label>
            <GlobalDateInput
              id="proposalSubmissionDueDate"
              label="Proposal Submission Due"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.proposalSubmissionDueDate)}
              onChange={(value) => onChange({ proposalSubmissionDueDate: fromDateToIso(value) })}
              {...timelineBounds("proposalSubmissionDueDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.proposalSubmissionDueDate) || timelineError("proposalSubmissionDueDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
            {showErrors && !safeData.proposalSubmissionDueDate && (
              <p className={errorClass}>Required.</p>
            )}
            {timelineError("proposalSubmissionDueDate") && <p className={errorClass}>{timelineError("proposalSubmissionDueDate")}</p>}
          </div>
          <div>
            <label className={labelClass}>
              Shortlist Notification <span className="text-red-500">*</span>
              <InfoTooltip text="The date by which shortlisted vendors will be notified." />
            </label>
            <GlobalDateInput
              id="shortlistNotificationDate"
              label="Shortlist Notification"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.shortlistNotificationDate)}
              onChange={(value) => onChange({ shortlistNotificationDate: fromDateToIso(value) })}
              {...timelineBounds("shortlistNotificationDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.shortlistNotificationDate) || timelineError("shortlistNotificationDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
            {showErrors && !safeData.shortlistNotificationDate && (
              <p className={errorClass}>Required.</p>
            )}
            {timelineError("shortlistNotificationDate") && <p className={errorClass}>{timelineError("shortlistNotificationDate")}</p>}
          </div>
        </div>

        {/* Vendor Presentation Opportunity */}
        <div className="mb-6">
          <label className={labelClass}>
            Will Vendors Be Given an Opportunity to Present if Shortlisted?{" "}
            <span className="text-red-500">*</span>
            <InfoTooltip text="If yes, shortlisted vendors will be invited to present their proposal before final selection." />
          </label>
          <YesNo
            value={safeData.vendorPresentationOpportunity}
            onChange={(v) =>
              onChange({
                vendorPresentationOpportunity: v,
                vendorPresentationDate: v !== "YES" ? "" : safeData.vendorPresentationDate,
              })
            }
          />
          {showErrors && !safeData.vendorPresentationOpportunity && (
            <p className={errorClass}>Please indicate whether vendors will present.</p>
          )}
          {safeData.vendorPresentationOpportunity === "YES" && (
            <div className={subPanelClass}>
              <label className={`${labelClass} mt-0`}>
                Presentation Date <span className="text-red-500">*</span>
              </label>
              <div className="max-w-60">
                <GlobalDateInput
                  id="vendorPresentationDate"
                  label="Presentation Date"
                  hideLabel
                  showFormatInLabel={false}
                  showErrorMessage={false}
                  format={pickerFormat}
                  value={fromIsoToDate(safeData.vendorPresentationDate)}
                  onChange={(value) => onChange({ vendorPresentationDate: fromDateToIso(value) })}
                  {...timelineBounds("vendorPresentationDate")}
                  showTodayShortcut
                  inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.vendorPresentationDate) || timelineError("vendorPresentationDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
                />
              </div>
              {showErrors && !safeData.vendorPresentationDate && (
                <p className={errorClass}>Required.</p>
              )}
              {timelineError("vendorPresentationDate") && <p className={errorClass}>{timelineError("vendorPresentationDate")}</p>}
            </div>
          )}
        </div>

        {/* Vendor Selection */}
        <div className="mb-6">
          <label className={labelClass}>
            Vendor Selection <span className="text-red-500">*</span>
            <InfoTooltip text="The date by which the vendor will be selected." />
          </label>
          <div className="max-w-60">
            <GlobalDateInput
              id="vendorSelectionDate"
              label="Vendor Selection"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.vendorSelectionDate)}
              onChange={(value) => onChange({ vendorSelectionDate: fromDateToIso(value) })}
              {...timelineBounds("vendorSelectionDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${(showErrors && !safeData.vendorSelectionDate) || timelineError("vendorSelectionDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
          </div>
          {showErrors && !safeData.vendorSelectionDate && (
            <p className={errorClass}>Required.</p>
          )}
          {timelineError("vendorSelectionDate") && <p className={errorClass}>{timelineError("vendorSelectionDate")}</p>}
        </div>

        {/* Target Decision Date */}
        <div className="mb-6">
          <label className={labelClass}>
            Target Decision Date
            <InfoTooltip text="The date by which you plan to award or select a vendor. Helps us schedule follow-ups appropriately." />
          </label>
          <div className="max-w-60">
            <GlobalDateInput
              id="decisionDate"
              label="Target Decision Date"
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              format={pickerFormat}
              value={fromIsoToDate(safeData.decisionDate)}
              onChange={(value) => onChange({ decisionDate: fromDateToIso(value) })}
              {...timelineBounds("decisionDate")}
              showTodayShortcut
              inputClassName={`${inputClass} pr-12 ${timelineError("decisionDate") ? "border-red-400 ring-1 ring-red-400/20" : ""}`}
            />
          </div>
          {timelineError("decisionDate") && <p className={errorClass}>{timelineError("decisionDate")}</p>}
        </div>

        {/* Competitive Bid */}
        <div className="mb-6">
          <label className={labelClass}>
            Competitive Bid?
            <InfoTooltip text="Are multiple vendors being solicited for this RFP? Helps us understand the competitive context and tailor our response strategy." />
          </label>
          <YesNo
            value={safeData.competitiveBid}
            onChange={(v) =>
              onChange({
                competitiveBid: v,
                numberOfProposals: v === "NO" ? "" : safeData.numberOfProposals,
              })
            }
          />
          {safeData.competitiveBid === "YES" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#969798]">
                How many vendors are being solicited?
              </p>
              <input
                type="number"
                min="1"
                value={safeData.numberOfProposals}
                onChange={(e) => onChange({ numberOfProposals: e.target.value })}
                placeholder="e.g. 3"
                className={inputClass}
                style={{ maxWidth: 160 }}
              />
            </div>
          )}
        </div>

        {mode === "advanced" && <>
        {/* ── Producer Consultation ── */}
        <Group label="Producer Consultation" />

        <div
          className="mb-6"
          data-assistant-field-key="/content/budgetPreferences/producerCallRequested"
        >
          <label className={labelClass}>
            Call with DXG Producer? <span className="text-red-500">*</span>
            <InfoTooltip text="A brief discovery call with a DXG producer helps clarify requirements, improve vendor responses, and advise on negotiation tactics with venues prior to signing an agreement." />
          </label>
          <YesNo
            value={safeData.callWithDxgProducer}
            onChange={(v) => onChange({ callWithDxgProducer: v })}
          />
          {safeData.callWithDxgProducer === "YES" && (
            <div className={subPanelClass}>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1DBFD3] hover:underline"
              >
                Schedule a call with your DXG producer
                <ExternalLink size={13} />
              </a>
            </div>
          )}
          {showErrors && !safeData.callWithDxgProducer && (
            <p className={errorClass}>Please indicate whether you&apos;d like a producer call.</p>
          )}
        </div>

        {/* ── Referral ── */}
        <Group label="Referral" />

        <div className="mb-6">
          <label className={labelClass}>
            How did you hear about this tool? <span className="text-red-500">*</span>
            <InfoTooltip text="Helps us understand where our clients are finding us so we can improve outreach and support." />
          </label>
          <SelectField
            value={safeData.howDidYouHear}
            onChange={(v) =>
              onChange({
                howDidYouHear: v,
                howDidYouHearOther: v !== "Other" ? "" : safeData.howDidYouHearOther,
              })
            }
            options={HEAR_OPTIONS}
            placeholder="Select how you heard about us"
            hasError={showErrors}
          />
          {safeData.howDidYouHear === "Other" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#969798]">
                Please specify
              </p>
              <textarea
                rows={2}
                value={safeData.howDidYouHearOther}
                onChange={(e) => onChange({ howDidYouHearOther: e.target.value })}
                placeholder="Tell us more…"
                className={`${inputClass} resize-none`}
              />
            </div>
          )}
          {showErrors && !safeData.howDidYouHear && (
            <p className={errorClass}>Please let us know how you heard about us.</p>
          )}
          {showErrors &&
            safeData.howDidYouHear === "Other" &&
            !safeData.howDidYouHearOther.trim() && (
              <p className={errorClass}>Please specify how you heard about us.</p>
            )}
        </div>
        </>}

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#e4e4e4]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          {mode === "basic" ? "Room specifications" : "Venue & Technical"}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          {mode === "basic" ? "Final review" : "Uploads & Co-Vendors"}
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default BudgetProposalPreferences;
