import { getVendorSubmissionDetailAction } from "@/app/actions/vendorResponse";
import VendorResponseDocument from "@/components/vendor/VendorResponseDocument";
import VendorResponseDocumentToolbar from "@/components/vendor/VendorResponseDocumentToolbar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor response review",
  robots: { index: false, follow: false },
};

const ID = /^[a-f0-9]{24}$/i;

function Problem({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#e5e7eb] p-6">
      <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow">
        <h1 className="text-lg font-extrabold text-slate-950">Review unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}

/* The printable vendor response. "Print view" opens it; "Download review" is
   this same page printed to PDF on the server (submission-export?format=pdf). */
export default async function ResponseReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const { id } = await params;
  const { versionId } = await searchParams;
  if (!ID.test(id)) return <Problem message="This vendor response link is not valid." />;
  const result = await getVendorSubmissionDetailAction(id);
  if (!result.success) return <Problem message={result.message} />;
  const detail = result.data;
  const version =
    detail.versions.find((entry) => entry.versionId === versionId) ??
    detail.versions.find((entry) => entry.versionId === detail.submission?.currentVersionId) ??
    detail.versions.at(-1);
  if (!version?.structuredResponse || !version.questionnaire || !version.calculationSnapshot) {
    return <Problem message="Only structured vendor responses have a printable review." />;
  }
  const pdfHref = `/api/vendor-responses/${encodeURIComponent(id)}/submission-export?versionId=${encodeURIComponent(version.versionId)}&format=pdf`;
  return (
    <>
      <VendorResponseDocument detail={detail} version={version} />
      <VendorResponseDocumentToolbar pdfHref={pdfHref} />
    </>
  );
}
