import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import PageTransition from "@/components/PageTransition";
import { AdminSessionRedirectGuard } from "@/components/console/AdminSessionRedirectGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] flex flex-col">
      <AdminSessionRedirectGuard />
      <Navbar />
      <PageTransition>{children}</PageTransition>
      <Footer />
      <CookieBanner />
    </div>
  );
}
