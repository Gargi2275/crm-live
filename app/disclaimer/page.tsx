import { FadeInUp } from "@/components/FadeInUp";

export const metadata = {
  title: "Disclaimer | FlyOCI",
};

export default function DisclaimerPage() {
  return (
    <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden min-h-screen">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy mb-8">Disclaimer</h1>
          <div className="prose prose-lg prose-indigo max-w-none text-textMuted font-body leading-relaxed">
            <p><strong>Last Updated: October 2023</strong></p>
            
            <h2 className="text-2xl font-heading font-bold text-navy mt-12 mb-4">1. Non-Government Affiliation</h2>
            <p>
              FlyOCI is a private, independent consultancy and service provider. We are <strong>not</strong> a government agency, nor are we affiliated with, endorsed by, or connected to the Government of India, the High Commission of India in London or Washington, the Ministry of Home Affairs (MHA), VFS Global, or any other official licensing body or government consulate.
            </p>
            
            <h2 className="text-2xl font-heading font-bold text-navy mt-8 mb-4">2. Service Scope</h2>
            <p>
              Our services are purely administrative and advisory. We assist applicants by reviewing documents (Document Audit), completing forms, providing appointment guidance, and communicating requirements clearly. We do not issue OCI cards, e-Visas, or passports.
            </p>
            <p>
              Applicants can apply for these services directly via the official government portals without paying our service fee. By choosing FlyOCI, you are paying for our expertise, support, time savings, and convenience.
            </p>

            <h2 className="text-2xl font-heading font-bold text-navy mt-8 mb-4">3. No Guarantee of Approval</h2>
            <p>
              The final decision to grant, refuse, or delay an OCI card, Indian e-Visa, or Indian passport rests solely with the Government of India and its designated consulates. We cannot guarantee the success of any application, the processing time, or the duration of validity granted.
            </p>

            <h2 className="text-2xl font-heading font-bold text-navy mt-8 mb-4">4. Liability</h2>
            <p>
              While we take every precaution to ensure the accuracy of the information we provide and the forms we complete on your behalf, we are not liable for any financial loss, travel delays, or other damages arising from rejected applications, incorrect information provided by the applicant, or sudden changes in government rules.
            </p>

            <h2 className="text-2xl font-heading font-bold text-navy mt-8 mb-4">5. Pricing</h2>
            <p>
              Our quoted prices include our service fee. Government processing fees and consular surcharges (e.g. VFS fees, ICWF fees) are separate and are payable to the respective authorities, unless explicitly stated as a package (e.g. for e-Visas where government fees are included). We will clearly communicate all costs.
            </p>

            <p className="mt-12 text-sm italic">
              By using our website and engaging our services, you acknowledge that you have read, understood, and agreed to this Disclaimer.
            </p>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
