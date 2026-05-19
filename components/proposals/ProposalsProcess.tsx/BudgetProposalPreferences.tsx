"use client";

import { ExternalLink } from "lucide-react";
import type { BudgetData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip, toggleItem } from "./shared";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

/* ─── Yes/No buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
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
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
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
  <select
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
  </select>
);

/* ─── Budget tier cards ─── */
const BUDGET_TIERS = [
  { value: "Essential",          range: "$10K – $25K",   producerCall: false },
  { value: "Standard",           range: "$25K – $50K",   producerCall: false },
  { value: "Production",         range: "$50K – $100K",  producerCall: false },
  { value: "Premium",            range: "$100K – $250K", producerCall: false },
  { value: "Enterprise",         range: "$250K – $500K", producerCall: true  },
  { value: "Signature",          range: "$500K+",        producerCall: true  },
  { value: "Not Yet Determined", range: "Need Guidance", producerCall: true  },
] as const;

const tierCardCls = (val: string, selected: string): string => {
  const base =
    "relative flex flex-col rounded-xl border-2 px-3 py-3 cursor-pointer transition-all select-none text-left";
  if (selected === val) return `${base} border-[#35bdf2] bg-[#35bdf2]/5`;
  return `${base} border-[#d7dce3] bg-white hover:border-[#35bdf2]/40`;
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
    return `${base} border-[#35bdf2] bg-[#35bdf2]/10 text-[#0f1b57]`;
  return `${base} border-[#d7dce3] bg-white text-slate-500 hover:border-slate-300`;
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
    desc: "Line-item equipment list with quantities, make/model, and daily rates.",
    alwaysDefault: true,
  },
  {
    label: "Labor Breakdown by Day",
    desc: "All crew positions by day with call times, rates, and overtime assumptions clearly stated.",
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
    desc: "Lead crew bios for TD, A1, L1, and Showcaller. Venue experience preferred.",
    suggestIf: "enterprise",
  },
  {
    label: "References",
    desc: "Minimum two references from comparable events at this venue type in the last 24 months.",
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
  if (checked) return `${base} border-[#35bdf2] bg-[#35bdf2]/5`;
  return `${base} border-[#d7dce3] bg-white hover:border-slate-300`;
};

const formatCheckCls = (checked: boolean): string => {
  const base =
    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all";
  if (checked) return `${base} border-[#35bdf2] bg-[#35bdf2]`;
  return `${base} border-[#d7dce3]`;
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
    label: "Technical Approach & Equipment Quality",
    guide: "Spec compliance, gear quality, E2/LED experience",
  },
  {
    key: "crewExperience",
    label: "Crew Experience & References",
    guide: "Bios, venue history, comparable event record",
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
const TIMELINE_OPTIONS = [
  "Within 24 Hours",
  "Within 3 Business Days",
  "1 Week",
  "2 Weeks",
  "Flexible",
];
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
}: Props) => {
  /* ─── Safe data ─── */
  const defMatrix = defaultEvalMatrix();
  const safeData: BudgetData = {
    ...data,
    estimatedAvBudget: data.estimatedAvBudget ?? "",
    budgetFlexibility: data.budgetFlexibility ?? "",
    proposalFormatPreferences: data.proposalFormatPreferences ?? [],
    evaluationMatrix: { ...defMatrix, ...(data.evaluationMatrix ?? {}) },
    timelineForProposal: data.timelineForProposal ?? "",
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
    onChange({ evaluationMatrix: newM });
  };

  const updateMatrix = (key: MK, raw: string) => {
    const v = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    onChange({ evaluationMatrix: { ...safeData.evaluationMatrix, [key]: v } });
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
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 7 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">
          Budget &amp; Proposal Preferences
        </h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Budget tier, evaluation matrix, proposal format requirements, and procurement timeline.
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ════════════════════════════════════════
            BLOCK A — Budget Selection
        ════════════════════════════════════════ */}
        <Group label="Budget Selection" />

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
                className={tierCardCls(tier.value, safeData.estimatedAvBudget)}
              >
                {tier.producerCall && (
                  <span className="mb-1.5 self-start rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600">
                    ★ Producer Call
                  </span>
                )}
                <span className="text-sm font-bold leading-tight text-[#0f1b57]">
                  {tier.value}
                </span>
                <span className="mt-0.5 text-xs text-slate-500">{tier.range}</span>
                {safeData.estimatedAvBudget === tier.value && (
                  <span className="absolute right-2 top-2 text-xs font-bold text-[#35bdf2]">
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

        {/* Field 2 — Budget Flexibility */}
        <div className="mb-6">
          <label className={labelClass}>
            Budget Flexibility
            <InfoTooltip text="How firm is this budget? This signals to vendors whether to submit their best scope or most cost-effective option. 'Value-Engineering Welcome' tells vendors you want creative alternatives that optimize cost without sacrificing impact." />
          </label>
          <div className="flex flex-wrap gap-2">
            {FLEXIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ budgetFlexibility: opt })}
                className={flexPillCls(opt, safeData.budgetFlexibility)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

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
                  className={formatCardCls(checked)}
                >
                  <span className={formatCheckCls(checked)}>
                    {checked && (
                      <span className="text-[10px] font-bold text-white">✓</span>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0f1b57]">
                        {opt.label}
                      </span>
                      {suggested && (
                        <span className="rounded-full bg-[#35bdf2]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#35bdf2]">
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
            <div className="mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Auto-added based on your event profile
              </p>
              <div className="space-y-2">
                {autoAddedFormats.map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-xs text-[#35bdf2]">⚡</span>
                    <div>
                      <span className="text-xs font-semibold text-[#0f1b57]">{f.label}</span>
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

        {/* Matrix table */}
        <div className="mb-3 overflow-hidden rounded-xl border border-[#d7dce3]">
          <div className="grid grid-cols-[1fr_90px] border-b border-[#d7dce3] bg-[#f8faff] px-4 py-2.5">
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

            const guide =
              crit.key === "crewExperience" && venueName
                ? `Bios, ${venueName} history, comparable event record`
                : crit.guide;

            const w = safeData.evaluationMatrix[crit.key];
            const warnZero = !crit.allowZero && w === 0 && showErrors;

            return (
              <div
                key={crit.key}
                className="grid grid-cols-[1fr_90px] items-center border-b border-[#e8edf5] px-4 py-3 last:border-0"
              >
                <div>
                  <span className="block text-sm font-semibold text-[#0f1b57]">
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
                    className={`w-14 rounded-lg border px-2 py-1.5 text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20 ${
                      warnZero
                        ? "border-red-400 focus:border-red-400"
                        : "border-[#d7dce3] focus:border-[#35bdf2]"
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
              className="ml-auto rounded-lg border border-[#35bdf2] px-3 py-1.5 text-xs font-semibold text-[#35bdf2] transition-colors hover:bg-[#35bdf2]/5"
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

        {/* ════════════════════════════════════════
            BLOCK D — Procurement Timeline
        ════════════════════════════════════════ */}
        <Group label="Procurement Timeline" />

        {/* Proposal Timeline */}
        <div className="mb-6">
          <label className={labelClass}>
            Proposal Turnaround Needed <span className="text-red-500">*</span>
            <InfoTooltip text="How soon do you need the proposal delivered? This helps us prioritize turnaround and assign the right producer." />
          </label>
          <SelectField
            value={safeData.timelineForProposal}
            onChange={(v) => onChange({ timelineForProposal: v })}
            options={TIMELINE_OPTIONS}
            placeholder="Select turnaround timeline"
            hasError={showErrors}
          />
          {showErrors && !safeData.timelineForProposal && (
            <p className={errorClass}>Proposal timeline is required.</p>
          )}
        </div>

        {/* Target Decision Date */}
        <div className="mb-6">
          <label className={labelClass}>
            Target Decision Date
            <InfoTooltip text="The date by which you plan to award or select a vendor. Helps us schedule follow-ups appropriately." />
          </label>
          <input
            type="date"
            value={safeData.decisionDate}
            onChange={(e) => onChange({ decisionDate: e.target.value })}
            className={inputClass}
            style={{ maxWidth: 240 }}
          />
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
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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

        {/* Scoring Notes */}
        <div className="mb-6">
          <label className={labelClass}>
            Scoring Notes / Evaluation Instructions
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

        {/* ── Producer Consultation ── */}
        <Group label="Producer Consultation" />

        <div className="mb-6">
          <label className={labelClass}>
            Call with DXG Producer? <span className="text-red-500">*</span>
            <InfoTooltip text="A brief discovery call with your DXG producer helps clarify requirements and speeds up the proposal process. Strongly recommended for Enterprise and Signature tier events." />
          </label>
          <YesNo
            value={safeData.callWithDxgProducer}
            onChange={(v) => onChange({ callWithDxgProducer: v })}
          />
          {safeData.callWithDxgProducer === "YES" && (
            <div className={subPanelClass}>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#35bdf2] hover:underline"
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
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
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

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] transition-colors hover:bg-[#f5f7ff]"
        >
          ← Venue &amp; Technical
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2]! px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] transition-colors hover:bg-[#20a9de] active:scale-95"
        >
          Uploads &amp; Co-Vendors →
        </button>
      </div>
    </section>
  );
};

export default BudgetProposalPreferences;
