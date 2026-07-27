"use client";

import Image from "next/image";
import Link from "next/link";

import { FadeInUp } from "@/components/FadeInUp";

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <FadeInUp className="scroll-mt-24">
      <section
        id={id}
        className="rounded-[22px] border border-blue-100 border-l-4 border-l-primary bg-white p-6 shadow-[0_10px_28px_rgba(59,130,246,0.08)] md:p-8"
      >
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-[1.35rem]">{title}</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-700 md:text-[16px]">{children}</div>
      </section>
    </FadeInUp>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-base font-semibold uppercase tracking-[0.18em] text-slate-700">
      {children}
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-none space-y-2 pl-0">
      {items.map((item) => (
        <li key={item} className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function GdprCompliancePage() {
  return (
    <main className="min-h-screen scroll-smooth bg-white text-slate-900" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="border-b border-blue-100 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <Image src="/logo.png" alt="FlyOCI" width={150} height={50} className="h-10 w-auto" priority />
          <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-slate-700">
            GDPR Compliance
          </div>
        </div>
      </header>

      <section className="border-b border-blue-100 bg-[#F8FBFF]">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-[3.5rem]">
              FlyOCI GDPR Compliance
            </h1>
            <Pill>
              Last updated: <span className="text-lg md:text-xl">27/07/2026</span>
            </Pill>
          </div>
          <div className="mt-8 space-y-4">
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              FlyOCI Limited, trading as FlyOCI, is committed to protecting personal data in line with the UK General Data
              Protection Regulation (UK GDPR), the Data Protection Act 2018, and, where applicable, the EU GDPR.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              This page summarises how we meet those obligations when you use our website, customer portal, document
              upload tools, and OCI, e-Visa, passport, apostille and related support services.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              For full details of how we collect and use personal data, please also read our{" "}
              <Link href="/privacy-policy" className="font-medium text-blue-700 hover:text-blue-800">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/cookies" className="font-medium text-blue-700 hover:text-blue-800">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <div className="w-full px-4 py-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <SectionCard id="who-we-are" title="1. Who We Are">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] p-4">
                <p className="text-sm font-semibold tracking-wide text-slate-600">Legal name</p>
                <p className="mt-1 text-[15px] font-medium text-slate-900">FlyOCI Limited</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] p-4">
                <p className="text-sm font-semibold tracking-wide text-slate-600">Trading name</p>
                <p className="mt-1 text-[15px] font-medium text-slate-900">FlyOCI</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] p-4">
                <p className="text-sm font-semibold tracking-wide text-slate-600">Company number</p>
                <p className="mt-1 text-[15px] font-medium text-slate-900">16856950</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] p-4">
                <p className="text-sm font-semibold tracking-wide text-slate-600">Registered office</p>
                <p className="mt-1 text-[15px] font-medium text-slate-900">71A Thurlby Road, Wembley, HA0 4RT</p>
              </div>
            </div>
            <p>
              Email:{" "}
              <a href="mailto:support@flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">
                support@flyoci.com
              </a>
            </p>
            <p>
              For most services, FlyOCI acts as the data controller. Where we use hosting, payment, CRM, storage or
              messaging providers, they may act as processors or independent controllers depending on the service.
            </p>
          </SectionCard>

          <SectionCard id="commitment" title="2. Our GDPR Commitment">
            <p>We design our processes to respect the core principles of UK GDPR:</p>
            <BulletList
              items={[
                "Lawfulness, fairness and transparency",
                "Purpose limitation — data is used for clear, stated purposes",
                "Data minimisation — we only collect what we need for the service",
                "Accuracy — we ask you to keep details and documents up to date",
                "Storage limitation — we retain data only as long as necessary",
                "Integrity and confidentiality — appropriate security measures",
                "Accountability — we document how we handle personal data",
              ]}
            />
          </SectionCard>

          <SectionCard id="data-we-process" title="3. Personal Data We Process">
            <p>
              Depending on the service, we may process identity, contact, passport, nationality, travel, payment,
              document and communication data. This can include sensitive application materials such as passport scans,
              certificates and photographs required for official forms.
            </p>
            <p>
              We process this information only where it is necessary to provide our document assistance and application
              support services, to communicate with you, to take payment, to meet legal obligations, or where you have
              given consent (for example for non-essential cookies or marketing).
            </p>
          </SectionCard>

          <SectionCard id="lawful-bases" title="4. Lawful Bases We Rely On">
            <p>Depending on the activity, FlyOCI may rely on one or more of the following lawful bases:</p>
            <BulletList
              items={[
                "Contract — to deliver the service you have requested or purchased",
                "Legitimate interests — to operate, secure and improve our website and services, and to prevent fraud",
                "Legal obligation — accounting, tax, regulatory and complaint records",
                "Consent — where required, including certain marketing or non-essential cookies",
                "Vital interests — only in rare cases where needed to protect someone’s life or safety",
              ]}
            />
            <p>
              Where we rely on legitimate interests, we balance those interests against your rights and expectations.
              You can object to certain processing — see the rights section below.
            </p>
          </SectionCard>

          <SectionCard id="your-rights" title="5. Your Data Protection Rights">
            <p>Under UK GDPR you have the right to:</p>
            <BulletList
              items={[
                "Be informed about how your data is used",
                "Access a copy of your personal data (subject access request)",
                "Ask us to correct inaccurate or incomplete data",
                "Ask us to erase data in certain circumstances",
                "Restrict processing in certain circumstances",
                "Data portability, where processing is based on consent or contract and is automated",
                "Object to processing based on legitimate interests or to direct marketing",
                "Withdraw consent where processing is based on consent",
                "Not be subject to solely automated decisions that produce legal or similarly significant effects (FlyOCI does not make such decisions)",
              ]}
            />
            <p>
              To exercise any of these rights, email{" "}
              <a href="mailto:support@flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">
                support@flyoci.com
              </a>
              . We may need to verify your identity before responding. We aim to respond within one month, or explain if
              we need more time where the law allows.
            </p>
            <p>
              Some rights are limited. For example, we may need to keep certain records for tax, legal claims, fraud
              prevention or to evidence the service we provided.
            </p>
          </SectionCard>

          <SectionCard id="security" title="6. Security Measures">
            <p>We take practical steps to protect personal data, including:</p>
            <BulletList
              items={[
                "Encrypted connections (HTTPS) for our website and portal",
                "Access controls for staff who handle customer files",
                "Secure document upload and storage workflows where available",
                "Payment processing through third-party providers (we do not normally store full card numbers)",
                "Internal processes for detecting and responding to suspected breaches",
              ]}
            />
            <p>
              No online system is completely secure. Please use strong passwords for portal accounts and avoid sending
              sensitive documents through insecure channels when a secure upload option is available.
            </p>
          </SectionCard>

          <SectionCard id="processors" title="7. Processors and Sharing">
            <p>
              We may share personal data with trusted service providers who help us run FlyOCI — for example hosting,
              email, CRM, document storage, analytics (where permitted) and payment processors. We only share what is
              needed for that purpose.
            </p>
            <p>
              We may also share data with professional advisers, or with authorities, where required by law or to
              protect our rights, customers or the public from fraud or misuse.
            </p>
            <p>FlyOCI does not sell personal data to third-party advertisers.</p>
          </SectionCard>

          <SectionCard id="transfers" title="8. International Transfers">
            <p>
              FlyOCI is based in the United Kingdom. Some tools or processors may store or access data outside the UK
              or EEA. Where that happens, we take steps required by UK data protection law, such as using providers in
              countries with an adequacy decision or putting appropriate contractual safeguards in place.
            </p>
          </SectionCard>

          <SectionCard id="retention" title="9. Retention">
            <p>
              We keep personal data only for as long as needed for the purpose it was collected — including delivering
              the service, handling queries, meeting accounting and legal requirements, and defending legal claims.
              Retention periods vary by record type. When data is no longer needed, we delete or anonymise it where
              practicable.
            </p>
          </SectionCard>

          <SectionCard id="children" title="10. Children’s Data">
            <p>
              Some services involve applications for children or dependants. We process children’s data only where
              provided by a parent, guardian or authorised adult for that service. If you believe we hold a child’s
              data without proper authority, contact us so we can investigate and take appropriate action.
            </p>
          </SectionCard>

          <SectionCard id="cookies" title="11. Cookies and Tracking">
            <p>
              Essential cookies may be used so the site and portal work. Non-essential cookies are used only where
              allowed by law, including where consent is required. You can manage cookie preferences in your browser
              and, where offered, through our cookie tools. See our{" "}
              <Link href="/cookies" className="font-medium text-blue-700 hover:text-blue-800">
                Cookie Policy
              </Link>{" "}
              for more information.
            </p>
          </SectionCard>

          <SectionCard id="breaches" title="12. Personal Data Breaches">
            <p>
              If we become aware of a personal data breach, we assess the risk and take appropriate action. Where
              required by law, we will notify the Information Commissioner’s Office (ICO) and, if necessary, affected
              individuals.
            </p>
          </SectionCard>

          <SectionCard id="complaints" title="13. Complaints">
            <p>If you are unhappy with how we handle your personal data, please contact us first so we can try to resolve it:</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:support@flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">
                support@flyoci.com
              </a>
            </p>
            <p>You also have the right to complain to the UK Information Commissioner’s Office:</p>
            <p>
              <strong>Website:</strong>{" "}
              <a
                href="https://ico.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 hover:text-blue-800"
              >
                ico.org.uk
              </a>
            </p>
            <p>
              <strong>Phone:</strong> 0303 123 1113
            </p>
          </SectionCard>

          <SectionCard id="changes" title="14. Changes to This Page">
            <p>
              We may update this GDPR Compliance page from time to time. The latest version will be published on this
              website with an updated “Last updated” date. Significant changes may also be highlighted through other
              reasonable means.
            </p>
          </SectionCard>

          <SectionCard id="contact" title="15. Contact">
            <p>For GDPR questions, data subject requests or privacy complaints:</p>
            <p>
              <strong>FlyOCI Privacy Team</strong>
            </p>
            <p>
              <strong>Legal name:</strong> FlyOCI Limited
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:support@flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">
                support@flyoci.com
              </a>
            </p>
            <p>
              <strong>Address:</strong> 71A Thurlby Road, Wembley, HA0 4RT
            </p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
