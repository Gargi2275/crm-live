import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import PageTransition from "@/components/PageTransition";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100svh] flex flex-col">
      <Navbar />
      <PageTransition>{children}</PageTransition>
      <Footer />
      <CookieBanner />
    </div>
  );
}
