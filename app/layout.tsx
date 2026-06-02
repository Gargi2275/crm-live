import type { Metadata } from "next";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import { AuthProvider } from "@/context/AuthContext";

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
      <body className="font-body antialiased bg-background text-textPrimary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
