import { getVendorSubmissionDetailAction } from "@/app/actions/vendorResponse";
import VendorResponseDetailWorkspace from "@/components/vendor/VendorResponseDetailWorkspace";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function VendorResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getVendorSubmissionDetailAction(id);
  if (!result.success) {
    return (
      <section
        className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle className="mx-auto text-amber-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">
          Response unavailable
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          {result.message}
        </p>
        <Link
          href="/vendor-responses"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#008ad2] px-4 text-sm font-bold text-white"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Return to vendor responses
        </Link>
      </section>
    );
  }
  return <VendorResponseDetailWorkspace detail={result.data} />;
}
