import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dxg-rfp-tool-dashboard.vercel.app"),
  title: "Dashboard",
  description: "RFP Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <LayoutWrapper>{children}</LayoutWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}
