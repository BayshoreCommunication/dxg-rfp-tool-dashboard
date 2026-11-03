"use client";

import { Download, KeyRound } from "lucide-react";
import { CopyButton, primaryButtonClass, primaryButtonStyle, secondaryButtonClass } from "./ui";
import { recoveryCodesFileText } from "./enrolmentState";

/* Shown once, right after the codes are created. */
const RecoveryCodesPanel = ({
  codes,
  account,
  onDone,
}: {
  codes: string[];
  account?: string;
  onDone: () => void;
}) => {
  const text = recoveryCodesFileText(codes, account);
  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rfpilot-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4 md:p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
        <KeyRound size={16} />
        Save your recovery codes now
      </div>
      <p className="mt-1 text-sm text-amber-900/80">
        If you lose your phone, each code signs you in once. This is the only time we show them.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm text-[#222628] sm:grid-cols-5" aria-label="Recovery codes">
        {codes.map((code) => (
          <li key={code} className="rounded border border-amber-200 bg-white px-2 py-1.5 text-center tracking-wide">
            {code}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={codes.join("\n")} label="Copy codes" />
        <button type="button" onClick={download} className={secondaryButtonClass + " px-3 py-1.5 text-xs"}>
          <Download size={14} />
          Download
        </button>
        <button type="button" onClick={onDone} className={primaryButtonClass + " ml-auto"} style={primaryButtonStyle}>
          I&apos;ve saved them
        </button>
      </div>
    </div>
  );
};

export default RecoveryCodesPanel;
