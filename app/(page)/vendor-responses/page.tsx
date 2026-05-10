import { getVendorResponsesAction, VendorResponseItem } from "@/app/actions/vendorResponse";
import VendorResponsesView from "@/components/vendor/VendorResponsesView";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default async function VendorResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unreadOnly?: string }>;
}) {
  const { page: pageParam, unreadOnly: unreadParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const unreadOnly = unreadParam === "true";

  const res = await getVendorResponsesAction({ page, limit: 20, unreadOnly });
  const pagination = res.pagination as Pagination | undefined;

  return (
    <VendorResponsesView
      initialResponses={
        res.success && Array.isArray(res.data)
          ? (res.data as VendorResponseItem[])
          : []
      }
      initialUnreadCount={typeof res.unreadCount === "number" ? res.unreadCount : 0}
      currentPage={page}
      totalPages={pagination?.totalPages ?? 1}
      totalCount={pagination?.total ?? 0}
    />
  );
}
