import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CategoryFilterProvider } from "@/components/providers/category-filter-provider";
import "./globals.css";

// Font configurations
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cloud Climb",
    template: "%s | Cloud Climb",
  },
  description: "Insights on cloud architecture, certification strategies, and modern software engineering.",
  keywords: ["cloud", "architecture", "certification", "engineering", "tutorials", "blog"],
  authors: [{ name: "Cloud Climb" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: "Cloud Climb",
    title: "Cloud Climb",
    description: "Insights on cloud architecture, certification strategies, and modern software engineering.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud Climb",
    description: "Insights on cloud architecture, certification strategies, and modern software engineering.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>
        <CategoryFilterProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </CategoryFilterProvider>
      </body>
    </html>
  );
}
