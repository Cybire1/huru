import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huru — AI inference on 0G",
  description:
    "Use 0G's decentralized compute through a simple API. Keys, credits, and verification — no wallets required.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Huru — AI inference on 0G",
    description:
      "Use 0G's decentralized compute through a simple API. Keys, credits, and verification — no wallets required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
