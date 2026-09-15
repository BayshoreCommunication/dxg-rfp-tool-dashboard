import { Loader2 } from "lucide-react";

export default function VendorResponseLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6f8] px-5">
      <div className="w-full max-w-md rounded-lg border border-[#dce4eb] bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto animate-spin text-[#008ad2]" size={28} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-[#16283c]">Opening your response workspace</h1>
        <p className="mt-2 text-sm text-[#607487]" role="status">Verifying the secure invitation and loading proposal requirements.</p>
      </div>
    </main>
  );
}
