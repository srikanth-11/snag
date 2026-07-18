import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TopLoader } from "@/components/TopLoader";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const DESC =
  "Paste a URL and Snag sends an AI agent through your live app like a thorough QA engineer, catching the real bugs your users would hit and handing you a report you can ship.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Snag: find the snags before your users do",
  description: DESC,
  openGraph: {
    title: "Snag: find the snags before your users do",
    description: "An AI agent explores your live web app in a real browser and hunts real bugs, live.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snag: find the snags before your users do",
    description: "An AI agent explores your live web app in a real browser and hunts real bugs, live.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopLoader />
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
