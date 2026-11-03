"use client";

import { completeSsoSignInAction } from "@/app/actions/auth";
import { ssoErrorMessage } from "@/lib/auth/sso";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthError, AuthHeading, AuthShell } from "./AuthShell";

const CompleteAside = () => (
  <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
    Almost there.
  </h2>
);

type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

/* D3: the backend's SSO callback lands here with ?handoff=. Trade it for a
   session once (the handoff is single use), then go to the dashboard. A
   Microsoft sign-in that needs our second factor continues on the sign-in
   page's code step, exactly like Google. */
const SsoCompletePage = ({
  handoff,
  errorCode,
  navigate = replaceLocation,
}: {
  handoff?: string;
  errorCode?: string;
  navigate?: Navigate;
}) => {
  const [error, setError] = useState(() =>
    errorCode ? ssoErrorMessage(errorCode) : !handoff ? ssoErrorMessage("SSO_HANDOFF_INVALID") : "",
  );
  // Strict Mode runs effects twice in development; the handoff only works once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !handoff || errorCode) return;
    started.current = true;
    // Keep the handoff out of history and anything that records URLs.
    window.history.replaceState(null, "", "/sso/complete");
    completeSsoSignInAction(handoff)
      .then((result) => {
        if (result.success) navigate("/dashboard");
        else if (result.twoFactor) navigate("/sign-in?step=two-factor");
        else setError(result.message || ssoErrorMessage(result.code));
      })
      .catch(() => setError(ssoErrorMessage("server_unavailable")));
  }, [handoff, errorCode, navigate]);

  return (
    <AuthShell aside={<CompleteAside />}>
      {error ? (
        <>
          <AuthHeading title="We couldn't sign you in" />
          <AuthError message={error} />
          <Link
            href="/sign-in"
            className="flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5"
            style={{ background: "#222628" }}
          >
            Back to sign in
          </Link>
        </>
      ) : (
        <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-[15px] font-bold text-gray-700">Signing you in...</p>
        </div>
      )}
    </AuthShell>
  );
};

export default SsoCompletePage;
