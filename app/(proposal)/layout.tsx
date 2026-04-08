import { ToastProvider } from "@/components/ui/ToastProvider";
import "../globals.css";




export const metadata = {
  metadataBase: new URL("https://dxg-rfp-tool-dashboard.vercel.app"),
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
