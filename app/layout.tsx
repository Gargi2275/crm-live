import type { Metadata } from "next";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { rootMetadata } from "@/lib/seo";

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="font-body antialiased bg-background text-textPrimary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
