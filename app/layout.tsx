import type { Metadata } from "next";
import { Raleway, Poppins, DM_Mono } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const monoDM = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
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
      <body className={`${raleway.variable} ${poppins.variable} ${monoDM.variable} font-body antialiased bg-background text-textPrimary`}>
        {children}
      </body>
    </html>
  );
}
