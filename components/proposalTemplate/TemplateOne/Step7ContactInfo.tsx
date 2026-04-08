type Step7ContactInfoProps = {
  proposalData?: any;
};

export default function Step7ContactInfo({ proposalData }: Step7ContactInfoProps) {
  const data = proposalData || {};
  
  const firstName = data.contactFirstName?.trim();
  const lastName = data.contactLastName?.trim();
  const contactName = [firstName, lastName].filter(Boolean).join(" ");
  
  const title = data.contactTitle?.trim();
  const organization = data.contactOrganization?.trim();
  const closingSubtitle = [title, organization].filter(Boolean).join(" @ ");
  
  const brandEmail = data.contactEmail?.trim();
  const contactPhone = data.contactPhone?.trim();
  const additionalNotes = data.anythingElse?.trim();

  const hasContactSection = Boolean(
    contactName ||
      closingSubtitle ||
      brandEmail ||
      contactPhone,
  );

  if (!hasContactSection && !additionalNotes) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-24 border-t border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {hasContactSection && (
            <div className={`bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 ${!additionalNotes ? "lg:col-span-2 max-w-2xl mx-auto" : ""}`}>
              <p className="text-xs uppercase font-bold tracking-[0.1em] text-slate-500 mb-6">
                Point of Contact
              </p>
              {contactName && (
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">
                  {contactName}
                </h3>
              )}
              {closingSubtitle && (
                <p
                  className="text-lg md:text-xl font-bold mb-8"
                  style={{ color: "var(--color-primary)" }}
                >
                  {closingSubtitle}
                </p>
              )}
              <div className="space-y-4">
                {brandEmail && (
                  <p className="text-base font-bold text-slate-600 flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      ></path>
                    </svg>
                    {brandEmail}
                  </p>
                )}
                {contactPhone && (
                  <p className="text-base font-bold text-slate-600 flex items-center gap-3">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      ></path>
                    </svg>
                    {contactPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {additionalNotes && (
            <div className={`p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden ${!hasContactSection ? "lg:col-span-2" : ""}`}>
              <div
                className="absolute top-0 left-0 w-full h-2"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
                }}
              />

              <h4 className="text-xl font-black mb-6 uppercase tracking-[0.05em] text-white flex items-center gap-3">
                <svg
                  className="w-6 h-6"
                  style={{ color: "var(--color-primary)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Additional Notes
              </h4>
              <p className="text-lg leading-relaxed text-slate-300">{additionalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
