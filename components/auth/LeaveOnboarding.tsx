"use client";

import { leaveOnboardingAction } from "@/app/actions/organizationProfile";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/* Rendered by /welcome when there is nothing to set up: clears the session's
   onboarding flag (a server action can set the cookie; the page can't), then
   goes to the dashboard. */
type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

const LeaveOnboarding = ({ navigate = replaceLocation }: { navigate?: Navigate }) => {
  useEffect(() => {
    void leaveOnboardingAction()
      .catch(() => undefined)
      .finally(() => navigate("/dashboard"));
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-label="Opening your dashboard" />
    </div>
  );
};

export default LeaveOnboarding;
