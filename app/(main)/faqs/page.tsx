import { FadeInUp } from "@/components/FadeInUp";
import { Accordion } from "@/components/ui/Accordion";
import { CTABanner } from "@/components/CTABanner";

export const metadata = {
  title: "Frequently Asked Questions | FlyOCI",
};

export default function FAQsPage() {
  const faqs = [
    {
      question: "Are you a government or embassy website?",
      answer: "No. FlyOCI is an independent, private service provider. We are not affiliated with any government or embassy. We help you prepare and manage your application so it meets the official requirements."
    },
    {
      question: "Why do I have to pay £15 for a Document Audit?",
      answer: "Most applications fail because of incorrect or incomplete documents. Our £15 audit fee covers the time of an expert who reviews your documents and sends you a clear written plan. This £15 is fully deducted from your service price when you proceed with any full application within 30 days, so it is not an extra cost."
    },
    {
      question: "Can I skip the Document Audit and pay directly for the full service?",
      answer: "If your case is extremely straightforward and you're confident with your documents, you may request to skip the audit. However, for more than 90% of customers we strongly recommend the audit. It reduces delays, avoids surprises, and ensures we can take responsibility for the file quality."
    },
    {
      question: "How do I know what documents to upload?",
      answer: "When you select your service (or 'Not Sure — Help Me Decide'), we show you a simple checklist of documents for your situation. You can also upload anything you think might be relevant; our team will guide you."
    },
    {
      question: "Where do I upload documents?",
      answer: "After submitting the initial form, you will be redirected to our secure upload page. You can upload clear photos or scanned copies (PDF/JPG/PNG). If you face issues, we will share a direct secure link via email/WhatsApp."
    },
    {
      question: "How do you communicate after payment?",
      answer: "You will receive an email confirmation with your reference number and next steps. You will also get an optional WhatsApp message from our support number for quick communication."
    },
    {
      question: "Do you also arrange apostille, affidavits or translations?",
      answer: "We will tell you exactly what is required. In some locations we may recommend partners or standard templates. In other cases you will need to arrange notarisation/apostille locally. We will guide you clearly so you don't feel lost."
    },
    {
      question: "What happens if my application is refused?",
      answer: "Our role is to prepare and guide your application professionally. We cannot guarantee approval (only the authorities can decide). However, our document-first approach significantly reduces the risk of refusal due to avoidable mistakes."
    },
    {
      question: "Do you keep my documents securely?",
      answer: "Yes. We use secure systems for document upload and storage, and we only keep data for as long as needed to complete your service and comply with legal obligations. See our Privacy Policy for full details."
    },
    {
      question: "I am helping my parents who are not tech-savvy. Can you help?",
      answer: "Yes. You can act on their behalf and upload documents for them. We can also coordinate via you on WhatsApp/email so your parents don't have to handle any technical steps."
    }
  ];

  return (
    <>
      <section className="pt-28 pb-14 px-4 sm:px-6 lg:px-8 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] relative overflow-hidden">
        <div className="absolute -top-16 -right-20 h-56 w-56 rounded-full bg-[#deedff] blur-3xl opacity-80 pointer-events-none motion-safe:animate-pulse" />
        <FadeInUp className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">Frequently Asked Questions</h1>
          <p className="text-lg text-textMuted font-body mb-8">
            Got a question? We&apos;re here to answer. If you don&apos;t see your question here, feel free to contact us.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Before You Start</p>
              <p className="mt-1 text-sm font-semibold text-primary">Process and document basics</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Payments</p>
              <p className="mt-1 text-sm font-semibold text-primary">Audit fee and service credits</p>
            </div>
            <div className="rounded-xl border border-[#d9e8ff] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(30,74,135,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#2b5e93] font-semibold">Support</p>
              <p className="mt-1 text-sm font-semibold text-primary">Secure uploads and updates</p>
            </div>
          </div>
        </FadeInUp>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8 bg-bg-page">
        <div className="max-w-4xl mx-auto">
          <FadeInUp className="rounded-2xl border border-[#d9e8ff] bg-white p-2 sm:p-3 shadow-[0_12px_28px_rgba(30,74,135,0.08)]">
            <Accordion items={faqs} />
          </FadeInUp>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
