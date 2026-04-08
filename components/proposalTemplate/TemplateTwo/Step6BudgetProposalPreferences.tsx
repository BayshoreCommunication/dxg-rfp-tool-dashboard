type Step6BudgetProposalPreferencesProps = {
  proposalData?: any;
};

export default function Step6BudgetProposalPreferences({
  proposalData,
}: Step6BudgetProposalPreferencesProps) {
  const data = proposalData || {};
  
  let budgetDisplay = (data.estimatedAvBudget || "").trim();
  if (data.budgetCustomAmount && data.budgetCustomAmount.trim()) {
    budgetDisplay = data.budgetCustomAmount.trim();
  }
  
  const timelineForProposal = (data.timelineForProposal || "").trim();
  
  let callWithDxgProducer = (data.callWithDxgProducer || "").trim();
  if (callWithDxgProducer.toLowerCase() === "no") {
    callWithDxgProducer = "";
  }
  
  const rawFormats = Array.isArray(data.proposalFormatPreferences) ? data.proposalFormatPreferences : [];
  const proposalFormats = rawFormats.filter((format: any) => typeof format === "string" && format.trim());
  
  let howDidYouHear = (data.howDidYouHear || "").trim();
  if (howDidYouHear.toLowerCase() === "other" && data.howDidYouHearOther) {
    howDidYouHear = data.howDidYouHearOther.trim();
  }

  const hasBudgetSection = Boolean(
    budgetDisplay ||
      proposalFormats.length > 0 ||
      timelineForProposal ||
      callWithDxgProducer ||
      howDidYouHear
  );

  if (!hasBudgetSection) {
    return null;
  }

  return (
    <section className="bg-white py-24">
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
            Step 6: Financials & Preferences
          </span>
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {budgetDisplay && (
            <div
              className={`p-10 md:p-14 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden shadow-2xl ${
                !timelineForProposal && !callWithDxgProducer && proposalFormats.length === 0 && !howDidYouHear
                  ? "lg:col-span-12"
                  : "lg:col-span-7"
              }`}
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end))",
              }}
            >
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <svg
                  width="300"
                  height="300"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 22H22L12 2Z" />
                </svg>
              </div>

              <p className="text-sm uppercase font-bold tracking-[0.14em] text-white/80 mb-4">
                Estimated AV Budget
              </p>
              <h3 className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter drop-shadow-lg">
                {budgetDisplay}
              </h3>
            </div>
          )}

          {(timelineForProposal || callWithDxgProducer || proposalFormats.length > 0 || howDidYouHear) && (
            <div className={`${!budgetDisplay ? "lg:col-span-12" : "lg:col-span-5"} p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-slate-50 flex flex-col justify-start gap-6`}>
              {timelineForProposal && (
                <div>
                  <p className="text-slate-500 text-xs md:text-sm uppercase font-bold mb-2 tracking-[0.1em]">
                    Timeline
                  </p>
                  <p className="text-slate-900 text-base md:text-lg font-black">
                    {timelineForProposal}
                  </p>
                </div>
              )}

              {callWithDxgProducer && (
                <div>
                  <p className="text-slate-500 text-xs md:text-sm uppercase font-bold mb-2 tracking-[0.1em]">
                    Call With DXG Producer
                  </p>
                  <p className="text-slate-900 text-base md:text-lg font-black">
                    {callWithDxgProducer}
                  </p>
                </div>
              )}

              {howDidYouHear && (
                <div>
                  <p className="text-slate-500 text-xs md:text-sm uppercase font-bold mb-2 tracking-[0.1em]">
                    Referral / Channel
                  </p>
                  <p className="text-slate-900 text-base md:text-lg font-bold">
                    {howDidYouHear}
                  </p>
                </div>
              )}

              {proposalFormats.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs md:text-sm uppercase font-bold mb-4 tracking-[0.1em]">
                    Preferred Formats
                  </p>
                  <div className="space-y-3">
                    {proposalFormats.map((format: string) => (
                      <div
                        key={format}
                        className="bg-white p-4 rounded-xl border border-slate-100 text-sm md:text-base font-black uppercase text-slate-700 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between"
                      >
                        {format}
                        <svg
                          className="w-5 h-5 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
