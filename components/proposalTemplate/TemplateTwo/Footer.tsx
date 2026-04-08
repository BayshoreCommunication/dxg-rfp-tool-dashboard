import type { TemplateOneData } from "../TemplateOne";

type FooterProps = {
  proposalData?: Partial<TemplateOneData>;
  fontFamily?: "Inter" | "Poppins" | "Roboto";
};

export default function Footer({ proposalData, fontFamily = "Poppins" }: FooterProps) {
  const data = proposalData;
  const hasSignature = Boolean(
    data?.signatureImageUrl ||
      data?.signatureText ||
      data?.signatureName ||
      data?.signatureRole,
  );

  return (
    <footer className="bg-slate-900 py-12 border-t border-slate-800">
      <div className="max-w-[1280px] mx-auto px-6">
        {hasSignature && (
          <div className="mb-8 rounded-2xl border border-slate-300 bg-white p-6 md:p-7 text-slate-900">
            <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500">
              {data?.signatureTitle || "Proposal Signature"}
            </p>
            <div className="mt-4 flex flex-col gap-2 items-start">
              {data?.signatureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.signatureImageUrl}
                  alt="Signature"
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <p
                  className="text-3xl font-semibold leading-none"
                  style={{
                    color: data?.signatureColor || "var(--proposal-signature-color, #2DC6F5)",
                    fontFamily: data?.signatureStyle
                      ? `"${data.signatureStyle}", var(--proposal-font-family, "${fontFamily}", var(--font-sans))`
                      : `var(--proposal-font-family, "${fontFamily}", var(--font-sans))`,
                  }}
                >
                  {data?.signatureText || data?.signatureName || ""}
                </p>
              )}
              <div
                className="mt-1 h-[2px] w-full max-w-[320px]"
                style={{
                  backgroundColor:
                    data?.signatureColor || "var(--proposal-signature-color, #2DC6F5)",
                }}
              />
              <p className="pt-1 text-sm font-bold text-slate-900">
                {data?.signatureName || data?.contactName || ""}
              </p>
              {(data?.signatureRole || data?.signatureDate) && (
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  {[data?.signatureRole, data?.signatureDate].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">
          {data?.brandName && <div>{data.brandName} - 2026</div>}
          <div className="flex gap-2 items-center">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            ></span>
            Ref: DXG-RFP-TOOL-2026
          </div>
        </div>
      </div>
    </footer>
  );
}
