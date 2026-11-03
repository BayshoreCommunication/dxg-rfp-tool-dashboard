"use client";

import { redactInvitationUrl } from "@/lib/auth/invitation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/* Analytics for the (auth) pages, with the invitation token in
   /invite/<token> replaced before anything leaves the browser. */
const RedactedAnalytics = () => (
  <>
    <Analytics
      beforeSend={(event) => ({ ...event, url: redactInvitationUrl(event.url) })}
    />
    <SpeedInsights
      beforeSend={(event) => ({ ...event, url: redactInvitationUrl(event.url) })}
    />
  </>
);

export default RedactedAnalytics;
