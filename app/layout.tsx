import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, DM_Mono } from 'next/font/google';
import "./globals.css";
import PageTransition from "@/components/PageTransition";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const monoDM = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "OCI, Indian e-Visa & Passport Services for UK & US Residents | FlyOCI",
  description: "FlyOCI helps UK and US residents of Indian origin with New OCI, OCI renewal, OCI updates, Indian e-Visas and Indian passport renewal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${plusJakartaSans.variable} ${monoDM.variable} font-body antialiased bg-background text-textPrimary`}>
        <Navbar />
        <PageTransition>{children}</PageTransition>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
