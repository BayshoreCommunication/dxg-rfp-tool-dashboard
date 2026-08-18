import { getEvidenceExtractionsAction } from "@/app/actions/evidenceExtraction";
import { getProposalByIdAction } from "@/app/actions/proposals";
import { getLatestVendorIntelligenceAction } from "@/app/actions/vendorIntelligence";
import {
  getVendorResponsesAction,
  type VendorResponseItem,
} from "@/app/actions/vendorResponse";
import ProposalResponseCards from "@/components/vendor/ProposalResponseCards";
import { deriveResponseCardSummary } from "@/lib/vendorResponses/responseCardSummary";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Pagination = {
  totalPages?: number;
};

const proposalTitle = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const event = (value as { event?: unknown }).event;
  if (!event || typeof event !== "object") return undefined;
  const title = (event as { eventName?: unknown }).eventName;
  return typeof title === "string" && title.trim() ? title.trim() : undefined;
};

const responseItems = (value: unknown): VendorResponseItem[] =>
  Array.isArray(value) ? (value as VendorResponseItem[]) : [];

const loadAllProposalResponses = async (proposalId: string) => {
  const first = await getVendorResponsesAction({
    page: 1,
    limit: 100,
    proposalId,
  });
  if (!first.success) return first;

  const totalPages = Math.max(
    1,
    Number((first.pagination as Pagination | undefined)?.totalPages) || 1,
  );
  if (totalPages === 1) return { ...first, data: responseItems(first.data) };

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getVendorResponsesAction({
        page: index + 2,
        limit: 100,
        proposalId,
      }),
    ),
  );
  const failed = remaining.find((result) => !result.success);
  if (failed) return failed;
  return {
    ...first,
    data: [
      ...responseItems(first.data),
      ...remaining.flatMap((result) => responseItems(result.data)),
    ],
  };
};

export default async function ProposalVendorResponsesPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const [responseResult, proposalResult] = await Promise.all([
    loadAllProposalResponses(proposalId),
    getProposalByIdAction(proposalId),
  ]);

  if (!responseResult.success) {
    return (
      <section
        role="alert"
        className="rounded-3xl border border-gray-border bg-white p-8 text-center shadow-sm"
      >
        <AlertTriangle className="mx-auto text-brand" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-navy">
          Proposal responses unavailable
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray">
          {typeof responseResult.message === "string"
            ? responseResult.message
            : "The vendor responses could not be loaded."}
        </p>
        <Link
          href="/vendor-responses"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Return to proposals
        </Link>
      </section>
    );
  }

  const responses = responseItems(responseResult.data);
  const summaryEntries = await Promise.all(
    responses.map(async (response) => {
      const versioned = response.submissionId && response.currentVersionId;
      const [extraction, intelligence] = versioned
        ? await Promise.all([
            getEvidenceExtractionsAction(
              proposalId,
              response.submissionId!,
              response.currentVersionId!,
            ),
            getLatestVendorIntelligenceAction(
              proposalId,
              response.submissionId!,
              response.currentVersionId!,
            ),
          ])
        : [null, null];
      return [
        response._id,
        deriveResponseCardSummary({ response, extraction, intelligence }),
      ] as const;
    }),
  );
  const title =
    proposalTitle(proposalResult.success ? proposalResult.data : null) ??
    responses[0]?.proposalTitle ??
    "Proposal responses";

  return (
    <ProposalResponseCards
      proposalId={proposalId}
      proposalTitle={title}
      responses={responses}
      summaries={Object.fromEntries(summaryEntries)}
    />
  );
}
