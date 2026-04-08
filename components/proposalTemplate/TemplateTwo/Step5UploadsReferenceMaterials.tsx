type Step5UploadsReferenceMaterialsProps = {
  proposalData?: any;
};

export default function Step5UploadsReferenceMaterials({
  proposalData,
}: Step5UploadsReferenceMaterialsProps) {
  const data = proposalData || {};
  
  const supportDocuments = Array.isArray(data.supportDocuments) 
    ? data.supportDocuments.filter((file: any) => typeof file === "string" && file.trim()) 
    : [];
    
  const avQuoteFiles = Array.isArray(data.reviewExistingAvQuote?.avQuoteFiles) 
    ? data.reviewExistingAvQuote.avQuoteFiles.filter((file: any) => typeof file === "string" && file.trim()) 
    : [];
    
  let reviewExistingAvQuote = (data.reviewExistingAvQuote?.reviewExistingAvQuote || "").trim();
  if (reviewExistingAvQuote.toLowerCase() === "no") {
    reviewExistingAvQuote = "";
  }

  const hasUploadsSection = Boolean(
    supportDocuments.length > 0 || avQuoteFiles.length > 0 || reviewExistingAvQuote,
  );

  if (!hasUploadsSection) {
    return null;
  }

  const renderFileLink = (fileUrl: string) => {
    // Extract filename from URL or just use URL
    const fileName = fileUrl.split("/").pop() || fileUrl;
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:text-[var(--color-primary)] transition-colors truncate"
        title={fileName}
      >
        <span className="mr-2 opacity-60">📄</span>
        <span className="underline decoration-slate-300 underline-offset-4 hover:decoration-[var(--color-primary)]">{fileName}</span>
      </a>
    );
  };

  return (
    <section className="bg-white py-24 border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <span
            className="font-bold tracking-[0.14em] text-sm uppercase"
            style={{ color: "var(--color-primary)" }}
          >
            Step 5: Uploads & Reference Materials
          </span>
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-12 text-center">
          Uploaded Files & Reference Inputs
        </h2>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {supportDocuments.length > 0 && (
            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
                Support Documents
              </h3>
              <ul className="space-y-2">
                {supportDocuments.map((file: string) => (
                  <li
                    key={file}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    {renderFileLink(file)}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {reviewExistingAvQuote && (
            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
                Existing AV Quote Review
              </h3>
              <p className="inline-flex rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-black uppercase text-slate-800">
                {reviewExistingAvQuote}
              </p>
            </article>
          )}

          {avQuoteFiles.length > 0 && (
            <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
                AV Quote Files
              </h3>
              <ul className="space-y-2">
                {avQuoteFiles.map((file: string) => (
                  <li
                    key={file}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    {renderFileLink(file)}
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
