import { getVendorResponseProposalsAction } from "@/app/actions/vendorResponse";
import VendorResponseProposalList from "@/components/vendor/VendorResponseProposalList";

const positivePage = (value?: string) => {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export default async function VendorResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageParam, search: searchParam } = await searchParams;
  const page = positivePage(pageParam);
  const search = searchParam?.trim() ?? "";
  const result = await getVendorResponseProposalsAction({ page, search });

  return (
    <VendorResponseProposalList
      data={result.success ? result.data : null}
      errorMessage={result.success ? undefined : result.message}
      search={search}
    />
  );
}
