import { getAssistantAccessAction } from "@/app/actions/aiAssistant";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Analytics } from "@vercel/analytics/next";
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
  const access =
    process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === "true"
      ? await getAssistantAccessAction()
      : null;
  const assistantEnabled = access?.success === true && access.data.enabled;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Signature cursive fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ToastProvider>
          <LayoutWrapper assistantEnabled={assistantEnabled}>
            {children}
          </LayoutWrapper>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
