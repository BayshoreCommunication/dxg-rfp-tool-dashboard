"use client";

import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { VerifyDomainPrompt } from "./verifyDomainRules";

const storageKey = (domain: string | null) => `rfpilot:verify-domain-dismissed:${domain ?? "any"}`;

export default function VerifyDomainBanner({ prompt }: { prompt: VerifyDomainPrompt }) {
  // Hidden until we've read the dismissal, so a dismissed banner never flashes.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(storageKey(prompt.domain)) === "1";
    } catch {
      dismissed = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!dismissed);
  }, [prompt.domain]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(prompt.domain), "1");
    } catch {
      // Storage blocked: hide for this visit only.
    }
    setVisible(false);
  };

  const at = prompt.domain ? `@${prompt.domain}` : "your company domain";

  return (
    <section
      role="region"
      aria-label="Verify your company domain"
      className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
    >
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {prompt.pending ? (
          <p>
            <span className="font-semibold">{at} isn&apos;t verified yet.</span> After you publish its DNS TXT record,
            open{" "}
            <Link href="/settings/security" className="font-semibold text-[#008ad2] hover:underline">Security</Link>{" "}
            and press <span className="font-semibold">Check now</span>. Until then, auto-approve for new colleagues stays off.
          </p>
        ) : (
          <p>
            <span className="font-semibold">Verify {at}</span> so colleagues who sign up are asked to join your
            organization, and so you can let them in without review.{" "}
            <Link href="/settings/security" className="font-semibold text-[#008ad2] hover:underline">Verify domain</Link>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-sky-700 hover:bg-sky-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
