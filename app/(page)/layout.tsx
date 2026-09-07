import { getAssistantAccessAction } from "@/app/actions/aiAssistant";
import { auth } from "@/auth";
import DevThemeToggle from "@/components/layout/DevThemeToggle";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dxg-rfp-tool-dashboard.vercel.app"),
  title: "Dashboard",
  description: "RFP Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [access, session] = await Promise.all([
    process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === "true"
      ? getAssistantAccessAction()
      : null,
    auth(),
  ]);
  const assistantEnabled = access?.success === true && access.data.enabled;
  const showLocalThemePreview = process.env.NODE_ENV === "development";

  return (
    <html
      lang="en"
      className={showLocalThemePreview ? "dark" : undefined}
      data-theme={showLocalThemePreview ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Signature cursive fonts – loaded via <link> for print/PDF templates */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased dark:bg-[#07131c] dark:text-[#e6eef5]"
        suppressHydrationWarning
      >
        <ToastProvider>
          <LayoutWrapper
            assistantEnabled={assistantEnabled}
            currentUser={
              session?.user
                ? {
                    name: session.user.name,
                    email: session.user.email,
                  }
                : undefined
            }
          >
            {children}
          </LayoutWrapper>
        </ToastProvider>
        {showLocalThemePreview && <DevThemeToggle defaultDark />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
