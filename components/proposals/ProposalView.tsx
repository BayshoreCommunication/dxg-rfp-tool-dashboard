"use client";

import {
  getProposalByIdAction,
  incrementProposalViewsAction,
} from "@/app/actions/proposals";
import TemplateOne, {
  type TemplateOneData,
} from "@/components/proposalTemplate/TemplateOne";
import TemplateTwo from "@/components/proposalTemplate/TemplateTwo";
import { Inter, Poppins, Roboto } from "next/font/google";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-proposal-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-proposal-poppins",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-proposal-roboto",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

type ProposalFont = "Inter" | "Poppins" | "Roboto";

type LegacyProposalSettings = {
  linkPrefix?: string;
  defaultFont?: ProposalFont;
  proposalLanguage?: string;
  defaultCurrency?: string;
  dateFormat?: string;
};

type ProposalSettingSnapshot = {
  branding?: {
    brandName?: string;
    linkPrefix?: string;
    defaultFont?: ProposalFont | string;
    signatureColor?: string;
    logoFile?: string | null;
  };
  proposals?: {
    proposalLanguage?: string;
    defaultCurrency?: string;
    dateFormat?: string;
    downloadPreview?: string;
    contacts?: {
      email?: { enabled?: boolean; value?: string };
      call?: { enabled?: boolean; value?: string };
    };
  };
  signatures?: {
    signatureType?: string;
    signatureImageUrl?: string;
    signatureText?: string;
    signatureStyle?: string;
  };
};

type ProposalData = {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  isActive?: boolean;
  isAccepted?: boolean;
  isOpen?: boolean;
  viewsCount?: number;
  proposalLink?: string;
  templateId?: "template-one" | "template-two";
  proposalSettings?: LegacyProposalSettings;
  proposalSetting?: ProposalSettingSnapshot;
  event?: {
    eventName?: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    attendees?: string;
    eventFormat?: string;
    eventType?: { eventType?: string; eventTypeOther?: string } | string;
  };
  roomByRoom?: Record<string, unknown>[] | Record<string, unknown>;
  production?: {
    scenicStageDesign?: string;
    unionLabor?: string;
    showCrewNeeded?: string[];
    otherRolesNeeded?: string;
  };
  venue?: {
    needRiggingForFlown?: any;
    needDedicatedPowerDrops?: any;
    standardAmpWall?: string;
    powerDropsHowMany?: string;
  };
  budget?: {
    estimatedAvBudget?: string;
    budgetCustomAmount?: string;
    timelineForProposal?: string;
    proposalFormatPreferences?: string[];
    callWithDxgProducer?: string;
    howDidYouHear?: string;
    howDidYouHearOther?: string;
  };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
    contactTitle?: string;
    contactOrganization?: string;
    contactEmail?: string;
    contactPhone?: string;
    anythingElse?: string;
  };
};

const extractObjectId = (slugOrId?: string | null) => {
  if (!slugOrId || typeof slugOrId !== "string") {
    return "";
  }
  // Match any 24-character hex sequence in the string
  const match = slugOrId.match(/[a-fA-F0-9]{24}/);
  return match?.[0] || "";
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toListText = (values?: string[]) => {
  const clean = (values || []).filter((v) => v && v.trim().length > 0);
  return clean.length > 0 ? clean.join(", ") : "";
};

const withFallback = (value: string, fallback = "Not specified") =>
  value || fallback;

const splitTitle = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { lineOne: name || "Event Proposal", lineTwo: "Overview" };
  }
  const mid = Math.ceil(parts.length / 2);
  return {
    lineOne: parts.slice(0, mid).join(" "),
    lineTwo: parts.slice(mid).join(" "),
  };
};

const normalizeProposalFont = (font?: string): ProposalFont => {
  if (font === "Inter" || font === "Poppins" || font === "Roboto") {
    return font;
  }
  return "Poppins";
};

const normalizeHexColor = (value?: string) => {
  const raw = (value || "").trim();
  const cleaned = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }
  return "#2DC6F5";
};

const formatDateByPattern = (value?: string, dateFormat?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  switch ((dateFormat || "").trim().toUpperCase()) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return formatDate(value);
  }
};

const normalizeProposalSettings = (proposal?: ProposalData) => {
  const legacy = proposal?.proposalSettings;
  const snapshot = proposal?.proposalSetting;
  const defaultFont = normalizeProposalFont(
    legacy?.defaultFont || snapshot?.branding?.defaultFont,
  );

  return {
    linkPrefix:
      legacy?.linkPrefix?.trim() ||
      snapshot?.branding?.linkPrefix?.trim() ||
      "",
    defaultFont,
    proposalLanguage:
      legacy?.proposalLanguage?.trim() ||
      snapshot?.proposals?.proposalLanguage?.trim() ||
      "English",
    defaultCurrency:
      legacy?.defaultCurrency?.trim() ||
      snapshot?.proposals?.defaultCurrency?.trim() ||
      "USD",
    dateFormat:
      legacy?.dateFormat?.trim() ||
      snapshot?.proposals?.dateFormat?.trim() ||
      "",
    downloadPreview: snapshot?.proposals?.downloadPreview?.trim() || "Yes",
    brandName: snapshot?.branding?.brandName?.trim() || "",
    logoFile: snapshot?.branding?.logoFile || null,
    signatureColor: snapshot?.branding?.signatureColor?.trim() || "#2DC6F5",
    contacts: {
      emailEnabled: snapshot?.proposals?.contacts?.email?.enabled,
      emailValue: snapshot?.proposals?.contacts?.email?.value?.trim() || "",
      callEnabled: snapshot?.proposals?.contacts?.call?.enabled,
      callValue: snapshot?.proposals?.contacts?.call?.value?.trim() || "",
    },
    signatures: {
      signatureType: snapshot?.signatures?.signatureType?.trim() || "",
      signatureImageUrl: snapshot?.signatures?.signatureImageUrl?.trim() || "",
      signatureText: snapshot?.signatures?.signatureText?.trim() || "",
      signatureStyle: snapshot?.signatures?.signatureStyle?.trim() || "",
    },
  };
};

const mapProposalToTemplate = (
  proposal: ProposalData,
  proposalLanguage = "English",
  options?: {
    dateFormat?: string;
    defaultCurrency?: string;
    signatureColor?: string;
    contactEmail?: string;
    contactPhone?: string;
    signature?: {
      type?: string;
      imageUrl?: string;
      text?: string;
      style?: string;
    };
    brandName?: string;
  },
): Partial<TemplateOneData> => {
  const language = proposalLanguage.trim().toLowerCase();
  const t = (english: string, spanish: string, french = english) =>
    language === "spanish" ? spanish : language === "french" ? french : english;
  const pick = (value?: string) => (value && value.trim() ? value.trim() : "");
  const eventName =
    proposal.event?.eventName?.trim() ||
    t("Event Proposal", "Propuesta del Evento", "Proposition d'evenement");
  const title = splitTitle(eventName);
  const organization = pick(proposal.contact?.contactOrganization);
  const createdLabel = formatDateByPattern(
    proposal.createdAt,
    options?.dateFormat,
  );
  const start = formatDateByPattern(
    proposal.event?.startDate,
    options?.dateFormat,
  );
  const end = formatDateByPattern(proposal.event?.endDate, options?.dateFormat);
  const fullName =
    `${proposal.contact?.contactFirstName || ""} ${proposal.contact?.contactLastName || ""}`.trim();
  const contactTitle = pick(proposal.contact?.contactTitle);
  const fallbackText = t("Not specified", "No especificado", "Non specifie");
  const resolvedContactEmail =
    options?.contactEmail || pick(proposal.contact?.contactEmail);
  const resolvedContactPhone =
    options?.contactPhone || pick(proposal.contact?.contactPhone);
  const budgetCurrency = (options?.defaultCurrency || "").trim();
  const formatBudgetDisplay = (value?: string) => {
    const text = pick(value);
    if (!text) return "";
    if (!budgetCurrency) return text;
    if (text.toUpperCase().includes(budgetCurrency.toUpperCase())) return text;
    if (!/\d/.test(text)) return text;
    return `${budgetCurrency} ${text}`;
  };

  const formatYesNoWithQty = (
    value?: any,
    qtyField?: string,
    oldQty?: string,
  ) => {
    let safeValue = "";
    let safeQty = "";
    if (typeof value === "object" && value !== null) {
      safeValue = pick(value[Object.keys(value)[0]]);
      safeQty = qtyField ? pick(value[qtyField]) : "";
    } else {
      safeValue = pick(value);
      safeQty = pick(oldQty);
    }
    if (!safeValue) return "";
    if (safeValue === "Yes" && safeQty) {
      return `Yes (${safeQty})`;
    }
    return safeValue;
  };
  const formatYesNoWithDetail = (
    value?: any,
    detailField?: string,
    oldDetail?: string,
  ) => {
    let safeValue = "";
    let safeDetail = "";
    if (typeof value === "object" && value !== null) {
      safeValue = pick(value[Object.keys(value)[0]]);
      safeDetail = detailField ? pick(value[detailField]) : "";
    } else {
      safeValue = pick(value);
      safeDetail = pick(oldDetail);
    }
    if (!safeValue) return "";
    if (safeValue === "Yes" && safeDetail) {
      return `Yes (${safeDetail})`;
    }
    return safeValue;
  };

  const metaChips = [
    proposal.status ? `${t("Status", "Estado")}: ${proposal.status}` : "",
    proposal.event?.attendees
      ? `${t("Attendees", "Asistentes")}: ${proposal.event.attendees}`
      : "",
    proposal.event?.eventFormat
      ? `${t("Format", "Formato")}: ${proposal.event.eventFormat}`
      : "",
    start ? `${t("Start", "Inicio")}: ${start}` : "",
    proposal.viewsCount !== undefined
      ? `${t("Views", "Vistas")}: ${proposal.viewsCount}`
      : "",
  ].filter((item) => item.trim().length > 0);

  const dateRange = start && end ? `${start} - ${end}` : start || end;
  const startDateLabel = start
    ? `${t("Start Date", "Fecha de inicio")}: ${start}`
    : "";
  const endDateLabel = end ? `${t("End Date", "Fecha de fin")}: ${end}` : "";
  const fallbackTimelineLabel = pick(proposal.budget?.timelineForProposal)
    ? `${t("Timeline", "Cronograma")}: ${pick(proposal.budget?.timelineForProposal)}`
    : "";

  // Resolve the first room from array (current format) or direct object (legacy)
  const firstRoom: Record<string, unknown> | undefined = Array.isArray(proposal.roomByRoom)
    ? (proposal.roomByRoom[0] as Record<string, unknown> | undefined)
    : (proposal.roomByRoom as Record<string, unknown> | undefined);

  const summaryBullets = [
    proposal.event?.venue
      ? `${t("Venue", "Lugar")}: ${proposal.event.venue}`
      : "",
    firstRoom?.roomFunction
      ? `${t("Room Function", "Función de sala")}: ${firstRoom.roomFunction}`
      : "",
    startDateLabel,
    endDateLabel,
    !startDateLabel && !endDateLabel ? fallbackTimelineLabel : "",
    proposal.production?.otherRolesNeeded
      ? `${t("Additional roles", "Roles adicionales")}: ${proposal.production.otherRolesNeeded}`
      : (firstRoom?.otherRolesNeeded as string | undefined)
        ? `${t("Additional roles", "Roles adicionales")}: ${firstRoom!.otherRolesNeeded}`
        : "",
  ].filter((item) => item.trim().length > 0);

  const aboutParts = [dateRange, pick(proposal.event?.venue)].filter(Boolean);
  const aboutText = aboutParts.length
    ? `${aboutParts.join(". ")}. ${t(
        "This proposal is tailored to your submitted scope and preferences.",
        "Esta propuesta está adaptada a su alcance y preferencias enviadas.",
      )}`
    : t(
        "This proposal is tailored to your submitted scope and preferences.",
        "Esta propuesta está adaptada a su alcance y preferencias enviadas.",
      );

  const additionalNotes =
    pick(proposal.contact?.anythingElse) ||
    pick(firstRoom?.contentVideoNeeds as string | undefined);

  const eventTypeRaw = proposal.event?.eventType;
  const eventTypeString =
    typeof eventTypeRaw === "object"
      ? eventTypeRaw.eventType === "Other"
        ? eventTypeRaw.eventTypeOther
        : eventTypeRaw.eventType
      : eventTypeRaw;

  return {
    badge: `${t("Proposal", "Propuesta")}${proposal.status ? ` • ${proposal.status}` : ""}${createdLabel ? ` • ${createdLabel}` : ""}`,
    ...(options?.brandName || organization
      ? { brandName: options?.brandName || organization }
      : {}),
    titleLineOne: title.lineOne,
    titleLineTwo: title.lineTwo,
    heroText:
      eventTypeString ||
      t(
        "A custom proposal prepared from your submitted event and production requirements.",
        "Una propuesta personalizada preparada según su evento y requisitos de producción enviados.",
      ),
    ...(metaChips.length > 0 ? { metaChips } : {}),
    ...(fullName
      ? { ctaPrimary: `${t("Send To", "Enviar a")} ${fullName}` }
      : {}),
    ctaSecondary: t(
      "Download Brief",
      "Descargar resumen",
      "Telecharger le resume",
    ),
    aboutTitle: t(
      "Project Snapshot",
      "Resumen del proyecto",
      "Apercu du projet",
    ),
    aboutText,
    ...(summaryBullets.length > 0 ? { summaryBullets } : {}),

    signatureColor: normalizeHexColor(options?.signatureColor),
    signatureTitle: t(
      "Authorized Signature",
      "Firma autorizada",
      "Signature autorisee",
    ),
    ...(fullName ? { signatureName: fullName } : {}),
    ...(contactTitle || organization
      ? {
          signatureRole: [contactTitle, organization]
            .filter(Boolean)
            .join(" - "),
        }
      : {}),
    ...(createdLabel ? { signatureDate: createdLabel } : {}),
    ...(options?.signature?.imageUrl && options?.signature?.type === "Upload"
      ? { signatureImageUrl: options.signature.imageUrl }
      : {}),
    ...(options?.signature?.text && options?.signature?.type !== "Upload"
      ? { signatureText: options.signature.text }
      : {}),
    ...(options?.signature?.style
      ? { signatureStyle: options.signature.style }
      : {}),
    ledTags: [
      pick(firstRoom?.videoFormatAspectRatio as string | undefined),
      pick(firstRoom?.videoRecordingType as string | undefined),
      pick(firstRoom?.audienceQaMethod as string | undefined),
    ].filter(Boolean),
  };
};

export default function ProposalView({
  slug,
  source,
}: {
  slug?: string;
  source?: string;
}) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const incrementedRef = useRef(false);
  const resolvedSettings = useMemo(
    () => normalizeProposalSettings(proposal || undefined),
    [proposal],
  );
  const proposalLanguage = resolvedSettings.proposalLanguage || "English";
  const isPublicAccess = source === "email" || source === "public";
  const languageKey = proposalLanguage.trim().toLowerCase();
  const t = (english: string, spanish: string, french = english) =>
    languageKey === "spanish"
      ? spanish
      : languageKey === "french"
        ? french
        : english;

  const proposalId = useMemo(() => extractObjectId(slug), [slug]);

  useEffect(() => {
    let mounted = true;

    const loadProposal = async () => {
      if (!proposalId) {
        if (!mounted) return;
        setError("Invalid proposal link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const res = await getProposalByIdAction(proposalId);
      if (!mounted) return;

      if (!res.success || !res.data || typeof res.data !== "object") {
        setError(res.message || "Proposal not found.");
        setProposal(null);
        setLoading(false);
        return;
      }

      const current = res.data as ProposalData;
      setProposal(current);
      setLoading(false);

      const canTrackView =
        !isPublicAccess ||
        (current?.status === "submitted" && current?.isActive !== false);

      if (!incrementedRef.current && canTrackView) {
        incrementedRef.current = true;
        const viewsRes = await incrementProposalViewsAction(proposalId);
        if (!mounted) return;
        if (
          viewsRes.success &&
          viewsRes.data &&
          typeof viewsRes.data === "object"
        ) {
          setProposal(viewsRes.data as ProposalData);
        }
      }
    };

    void loadProposal();

    return () => {
      mounted = false;
    };
  }, [proposalId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="h-12 w-60 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-[420px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h2 className="text-lg font-bold">
            {t(
              "Unable to load proposal",
              "No se pudo cargar la propuesta",
              "Impossible de charger la proposition",
            )}
          </h2>
          <p className="mt-2 text-sm">
            {error ||
              t(
                "Proposal not found.",
                "Propuesta no encontrada.",
                "Proposition introuvable.",
              )}
          </p>
        </div>
      </div>
    );
  }

  const isLiveProposal =
    proposal.status === "submitted" && proposal.isActive !== false;

  if (isPublicAccess && !isLiveProposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-bold">Proposal is not available</h2>
          <p className="mt-2 text-sm">
            This public proposal link is only available while the proposal is
            live.
          </p>
        </div>
      </div>
    );
  }

  const handleDownloadProposal = () => {
    if (downloading) return;
    setDownloading(true);

    const originalTitle = document.title;
    const printableTitle =
      proposal.event?.eventName?.trim() ||
      proposal.contact?.contactOrganization?.trim() ||
      "proposal";
    document.title = `${printableTitle}-proposal`;

    // ── Page dimensions ──
    const proposalRoot = document.querySelector(".proposal-print-root") as HTMLElement | null;

    // Fixed width: 1400px matches the template container + gutters
    // 1400px × 0.2646mm/px = 370mm
    const pageWidthMm = 406;

    // Height: full content height so nothing is cut (single continuous page)
    const contentHeightPx = proposalRoot?.scrollHeight ?? window.innerHeight;
    const pageHeightMm = Math.ceil(contentHeightPx * 0.2646) + 10;

    const printStyleId = "proposal-a4-print-style";
    const existingStyle = document.getElementById(printStyleId);
    const temporaryPrintStyle =
      existingStyle ||
      Object.assign(document.createElement("style"), { id: printStyleId });

    temporaryPrintStyle.textContent = `
      @media print {
        /* Full-width single continuous page */
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: 0mm;
        }

        html, body {
          width:      ${pageWidthMm}mm  !important;
          max-width:  ${pageWidthMm}mm  !important;
          height:     ${pageHeightMm}mm !important;
          margin:  0  !important;
          padding: 0  !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust:         exact !important;
        }

        /* Proposal root: fill the full page */
        .proposal-print-root {
          width:      100% !important;
          max-width:  100% !important;
          height:     ${pageHeightMm}mm !important;
          margin:  0  !important;
          padding: 0  !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }

        /* Remove Tailwind max-width caps from every inner container */
        .proposal-print-root .max-w-6xl,
        .proposal-print-root .max-w-5xl,
        .proposal-print-root .max-w-4xl,
        .proposal-print-root .max-w-3xl,
        .proposal-print-root .max-w-2xl,
        .proposal-print-root .max-w-xl,
        .proposal-print-root [class*="max-w-"] {
          max-width: 100% !important;
          width:     100% !important;
        }

        /* No page splits — single continuous page */
        .proposal-print-root *  {
          page-break-inside: auto !important;
          break-inside:      auto !important;
        }

        /* Hide UI-only floating elements */
        .no-print {
          display: none !important;
        }
      }
    `;

    if (!existingStyle) {
      document.head.appendChild(temporaryPrintStyle);
    }

    // Double rAF: first to apply styles, second to let layout reflow before print dialog
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } finally {
          document.title = originalTitle;
          temporaryPrintStyle.remove();
          setDownloading(false);
        }
      });
    });
  };

  const mappedTemplateData = mapProposalToTemplate(proposal, proposalLanguage, {
    dateFormat: resolvedSettings.dateFormat,
    defaultCurrency: resolvedSettings.defaultCurrency,
    signatureColor: resolvedSettings.signatureColor,
    contactEmail:
      resolvedSettings.contacts.emailEnabled === false
        ? ""
        : resolvedSettings.contacts.emailValue ||
          proposal.contact?.contactEmail ||
          "",
    contactPhone:
      resolvedSettings.contacts.callEnabled === false
        ? ""
        : resolvedSettings.contacts.callValue ||
          proposal.contact?.contactPhone ||
          "",
    signature: {
      type: resolvedSettings.signatures.signatureType,
      imageUrl: resolvedSettings.signatures.signatureImageUrl,
      text: resolvedSettings.signatures.signatureText,
      style: resolvedSettings.signatures.signatureStyle,
    },
    brandName: resolvedSettings.brandName,
  });
  const templateData: Partial<TemplateOneData> = {
    ...mappedTemplateData,
    createdAt: proposal.createdAt,
    proposalSetting: proposal.proposalSetting || {
      branding: {
        brandName: resolvedSettings.brandName,
        linkPrefix: resolvedSettings.linkPrefix,
        defaultFont: resolvedSettings.defaultFont,
        signatureColor: resolvedSettings.signatureColor,
      },
      proposals: {
        proposalLanguage: resolvedSettings.proposalLanguage,
        defaultCurrency: resolvedSettings.defaultCurrency,
        dateFormat: resolvedSettings.dateFormat,
        contacts: {
          email: {
            enabled: resolvedSettings.contacts.emailEnabled,
            value: resolvedSettings.contacts.emailValue,
          },
          call: {
            enabled: resolvedSettings.contacts.callEnabled,
            value: resolvedSettings.contacts.callValue,
          },
        },
      },
      signatures: {
        signatureType: resolvedSettings.signatures.signatureType,
        signatureImageUrl: resolvedSettings.signatures.signatureImageUrl,
        signatureText: resolvedSettings.signatures.signatureText,
        signatureStyle: resolvedSettings.signatures.signatureStyle,
      },
    },
    ctaSecondary: t("Download PDF", "Descargar PDF", "Telecharger le PDF"),
  };
  const templateFont = resolvedSettings.defaultFont;
  const selectedFontVariable =
    templateFont === "Inter"
      ? "var(--font-proposal-inter)"
      : templateFont === "Roboto"
        ? "var(--font-proposal-roboto)"
        : "var(--font-proposal-poppins)";
  const templateWrapperStyle = {
    "--proposal-font-family": `${selectedFontVariable}, var(--font-sans)`,
    "--proposal-signature-color": normalizeHexColor(
      resolvedSettings.signatureColor,
    ),
  } as CSSProperties;
  const fontClassNames = `${inter.variable} ${poppins.variable} ${roboto.variable}`;

  const templateOneProps = {
    proposalData: {
      ...(proposal as unknown as Partial<TemplateOneData>),
      ...templateData,
    },
    rawProposal: proposal,
    fontFamily: templateFont,
  };

  const canDownloadPreview = resolvedSettings.downloadPreview === "Yes";
  const hasGlobalActions = canDownloadPreview;

  const globalFloatingActions = hasGlobalActions ? (
    <div
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[99] no-print"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-xl backdrop-blur-md">
        {canDownloadPreview && (
          <button
            type="button"
            onClick={handleDownloadProposal}
            disabled={downloading}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 disabled:opacity-60 hover:bg-slate-50 transition"
          >
            {downloading
              ? t(
                  "Generating PDF...",
                  "Generando PDF...",
                  "Generation du PDF...",
                )
              : t("Download PDF", "Descargar PDF", "Telecharger le PDF")}
          </button>
        )}
      </div>
    </div>
  ) : null;

  console.log("check proposal data", proposal);

  return (
    <div className={fontClassNames} style={templateWrapperStyle}>
      {globalFloatingActions}
      {proposal.templateId === "template-two" ? (
        <TemplateTwo
          proposalData={proposal as unknown as Partial<TemplateOneData>}
          rawProposal={{
            ...proposal,
            // Inject resolved branding so logo + brandName are always available
            // even when proposalSetting was not stored on the proposal document
            proposalSetting: {
              ...(proposal.proposalSetting || {}),
              branding: {
                ...(proposal.proposalSetting?.branding || {}),
                logoFile:
                  proposal.proposalSetting?.branding?.logoFile ??
                  resolvedSettings.logoFile ??
                  null,
                brandName:
                  proposal.proposalSetting?.branding?.brandName?.trim() ||
                  resolvedSettings.brandName ||
                  "",
                signatureColor:
                  proposal.proposalSetting?.branding?.signatureColor?.trim() ||
                  resolvedSettings.signatureColor ||
                  "#2DC6F5",
              },
              signatures: {
                ...(proposal.proposalSetting?.signatures || {}),
                signatureType: resolvedSettings.signatures.signatureType,
                signatureImageUrl: resolvedSettings.signatures.signatureImageUrl,
                signatureText: resolvedSettings.signatures.signatureText,
                signatureStyle: resolvedSettings.signatures.signatureStyle,
              },
            },
          }}
          proposalLanguage={proposalLanguage}
          fontFamily={templateFont}
        />
      ) : (
        <TemplateOne {...templateOneProps} />
      )}
    </div>
  );
}
