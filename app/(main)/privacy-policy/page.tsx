"use client";

import Image from "next/image";

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
      <section id={id} className="rounded-[22px] border border-blue-100 border-l-4 border-l-primary bg-white p-6 shadow-[0_10px_28px_rgba(59,130,246,0.08)] md:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-[1.35rem]">
          {title}
        </h2>
        <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-700 md:text-[16px]">
          {children}
        </div>
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

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 scroll-smooth" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="border-b border-blue-100 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <Image src="/logo.png" alt="FlyOCI" width={150} height={50} className="h-10 w-auto" priority />
          <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-slate-700">
            Privacy Policy
          </div>
        </div>
      </header>

      <section className="border-b border-blue-100 bg-[#F8FBFF]">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-[3.5rem]">
              FlyOCI Privacy Policy
            </h1>
            <Pill>
              Last updated: <span className="text-lg md:text-xl">26/05/2026</span>
            </Pill>
          </div>
          <div className="mt-8">
            <p className="mt-4 text-[16px] leading-8 text-slate-700 md:text-[17px]">
              This Privacy Policy explains how FlyOCI Limited, trading as FlyOCI, collects, uses, stores, shares and protects personal information.
            </p>
            <p className="mt-3 text-[16px] leading-8 text-slate-700 md:text-[17px]">
              FlyOCI is based in the United Kingdom and processes personal data in accordance with the UK General Data Protection Regulation, UK GDPR, the Data Protection Act 2018 and other applicable data protection laws.
            </p>
            <p className="mt-3 text-[16px] leading-8 text-slate-700 md:text-[17px]">
              FlyOCI handles important personal documents. This may include passports, nationality records, birth certificates, marriage certificates, children's documents, travel details and application information. We treat this information seriously and use it only where necessary for our services.
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
            <p>Website: <a href="https://www.flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">www.flyoci.com</a></p>
            <p>Email: <a href="mailto:support@flyoci.com" className="font-medium text-blue-700 hover:text-blue-800">support@flyoci.com</a></p>
            <p>For most services, FlyOCI acts as the data controller. This means we decide why and how your personal data is processed.</p>
            <p>Where we use service providers such as hosting providers, CRM providers, payment processors, document storage providers or communication platforms, they may act as processors or independent controllers depending on the service.</p>
          </SectionCard>

          <SectionCard id="scope" title="2. Scope of This Privacy Policy">
            <p>This Privacy Policy applies when you:</p>
            <ul className="list-none space-y-2 pl-0">
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Visit our website</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Submit an enquiry</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Generate a file number</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Create a customer portal account</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Upload documents</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Make payment</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Purchase a service</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Contact us by email, phone, WhatsApp, SMS, form or portal</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Use our OCI, e-Visa, apostille or document support services</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">Provide personal data about an applicant, child, spouse, parent or other third party</li>
            </ul>
          </SectionCard>

          <SectionCard id="personal-data" title="3. Personal Data We Collect">
            <p>Depending on the service, we may collect the following categories of personal data.</p>
            <p><strong>Identity data:</strong> Full name, Previous names, Maiden name, Middle name, Date of birth, Place of birth, Gender (where required by official forms), Nationality, Citizenship details, Marital status where required, Parent names, Spouse details, Child details, Signature, Photograph</p>
            <p><strong>Contact data:</strong> Residential address, Correspondence address, Email address, Phone number, WhatsApp number, Alternative contact details</p>
            <p><strong>Passport, nationality and immigration-related data:</strong> Passport number, Passport issue date, Passport expiry date, Passport place of issue, Previous passport details, Previous Indian passport details, Surrender certificate details, Naturalisation certificate details, Residence permit or immigration status evidence where relevant, eVisa/share code information where relevant, Visa or travel history where relevant to the service</p>
            <p><strong>Application data:</strong> OCI application details, e-Visa application details, Apostille or legalisation details, Travel dates, Purpose of travel, Employment information where required by an official form, Family information, Address history, Declarations, Eligibility answers, Supporting explanations provided by you</p>
            <p><strong>Document data:</strong> We may collect copies of documents such as: Passport, Previous Indian passport, Surrender certificate, Birth certificate, Marriage certificate, Divorce document, Name change document, Deed poll, Naturalisation certificate, Utility bill, Bank statement where used as address evidence, Parent consent document, Court order, Adoption or custody document where relevant, Apostille document, Translation, Photograph, Signature, Any other document you upload or provide</p>
            <p><strong>Payment data:</strong> Payment amount, Payment status, Transaction reference, Billing name, Billing contact details, Date of payment, Refund status where applicable. FlyOCI does not normally store full card numbers. Card payments are usually processed by third-party payment providers.</p>
            <p><strong>Technical data:</strong> When you use our website, we may collect: IP address, Browser type, Device type, Operating system, Website usage data, Pages visited, Date and time of visit, Referral source, Cookie data, Security logs</p>
            <p><strong>Communication data:</strong> We may keep records of: Emails, Phone notes, WhatsApp messages, SMS messages, Portal messages, Enquiry forms, Complaint records, Customer support notes</p>
          </SectionCard>

          <SectionCard id="special-category" title="4. Special Category Data and Sensitive Documents">
            <p>Some documents or information you provide may reveal sensitive information, including nationality, ethnic origin, family circumstances, health information, biometric-related information, religious information or other sensitive matters.</p>
            <p>Where we process special category data, we will only do so where:</p>
            <ul className="list-none space-y-2 pl-0">
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">It is necessary for providing the requested service;</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">We have a lawful basis under Article 6 of the UK GDPR; and</li>
              <li className="relative pl-6 before:absolute before:left-0 before:text-blue-700 before:content-['✓']">A relevant condition under Article 9 of the UK GDPR applies, such as explicit consent where appropriate, establishment/exercise/defence of legal claims where applicable, or another lawful condition depending on the context.</li>
            </ul>
            <p>We do not intentionally request unnecessary sensitive information. If a document contains information not needed for the service, we may still process it where it forms part of the document required for your application or file.</p>
          </SectionCard>

          <SectionCard id="children" title="5. Children's Data">
            <p>FlyOCI may process children's personal data where a parent, guardian or authorised adult asks us to assist with a child's OCI, e-Visa, apostille or related service.</p>
            <p>Children's data may include: Name, Date of birth, Place of birth, Passport details, Birth certificate, Photograph, Parent details, Consent forms, Custody documents, Nationality documents, Application details</p>
            <p>Where you provide children's data, you confirm that you have parental responsibility, legal authority or appropriate permission to provide that information to FlyOCI.</p>
            <p>We handle children's data with additional care and only use it for the relevant service, legal compliance, security, record-keeping and dispute resolution purposes.</p>
          </SectionCard>

          <SectionCard id="collection" title="6. How We Collect Personal Data">
            <p>We collect personal data when you: Complete website forms, Submit an enquiry, Generate a file number, Create a portal account, Upload documents, Make payment, Send documents by email or WhatsApp, Contact us by phone, Use our services, Authorise us to prepare or assist with an application</p>
            <p>We may also receive information from: Official portals (where you authorise access or submission), VFS or appointment systems where relevant, Payment providers, Courier companies, Apostille or legalisation providers, Translation providers, Notaries or solicitors, Other third parties involved in the service, Public sources where necessary for fraud prevention or verification</p>
          </SectionCard>

          <SectionCard id="lawful-basis" title="7. Why We Use Personal Data and Lawful Basis">
            <div className="overflow-hidden rounded-2xl border border-blue-100">
              <div className="grid grid-cols-1 gap-0 bg-[#DBEAFE] px-4 py-3 text-[13px] font-semibold text-slate-900 md:grid-cols-3">
                <div>Purpose</div>
                <div>Personal data used</div>
                <div>Lawful basis</div>
              </div>
              {[
                ["To respond to enquiries", "Name, contact details, enquiry details", "Legitimate interests or steps before contract"],
                ["To create a FlyOCI file number", "Name, contact details, service selected, applicant details", "Contract or steps before contract"],
                ["To provide OCI, e-Visa or apostille assistance", "Identity data, document data, application data, contact data", "Contract"],
                ["To review uploaded documents", "Identity data, passport data, document data, application data", "Contract"],
                ["To process payment", "Payment data, billing data, transaction data", "Contract and legal obligation"],
                ["To communicate with customers", "Contact data, file data, communication records", "Contract and legitimate interests"],
                ["To manage portal access", "Login data, file data, technical data", "Contract and legitimate interests"],
                ["To prevent fraud or misuse", "Identity data, payment data, technical data, communication data", "Legitimate interests and legal obligation"],
                ["To keep accounting and tax records", "Payment data, invoice data, customer data", "Legal obligation"],
                ["To handle complaints or disputes", "File data, communication data, payment data, documents", "Legitimate interests and legal claims"],
                ["To improve website and services", "Technical data, usage data, feedback", "Legitimate interests or consent where required"],
                ["To send marketing where permitted", "Contact data, marketing preferences", "Consent or legitimate interests where legally permitted"],
                ["To comply with law or authority requests", "Relevant personal data depending on request", "Legal obligation or legitimate interests"],
              ].map(([purpose, dataUsed, basis], index) => (
                <div key={purpose as string} className={`grid grid-cols-1 gap-0 px-4 py-3 text-[14px] text-slate-700 md:grid-cols-3 ${index % 2 === 0 ? "bg-white" : "bg-[#F0F9FF]"}`}>
                  <div>{purpose}</div>
                  <div>{dataUsed}</div>
                  <div>{basis}</div>
                </div>
              ))}
            </div>
            <p>Where consent is used, you may withdraw consent at any time. Withdrawal of consent does not affect processing already carried out lawfully before withdrawal.</p>
          </SectionCard>

          <SectionCard id="ai" title="8. Use of AI and Automation">
            <p>FlyOCI may use AI-assisted tools, workflow automation, CRM systems, document management tools, checklists or internal software to support document review, case handling, staff workflows, missing-document detection and customer communication.</p>
            <p>AI or automation may help us organise or review information, but FlyOCI does not use AI to make official government decisions.</p>
            <p>Official decisions are made by the relevant government body, consular authority, VFS Global, apostille authority or third party.</p>
            <p>Where automation is used internally, FlyOCI remains responsible for using reasonable care and appropriate safeguards.</p>
          </SectionCard>

          <SectionCard id="sharing" title="9. Sharing Personal Data">
            <p>We may share personal data where necessary with: Government authorities, Indian High Commission or consular authorities, VFS Global, Apostille or legalisation providers, Translation providers, Notaries, Solicitors or professional advisers, Courier and postal providers, Payment processors, CRM providers, Cloud storage providers, Hosting providers, IT support providers, Email/SMS/phone/WhatsApp communication providers, Fraud prevention or identity verification providers, Accountants, Insurers, Law enforcement or regulators where required.</p>
            <p>We only share personal data that is necessary for the relevant purpose.</p>
          </SectionCard>

          <SectionCard id="transfers" title="10. International Transfers">
            <p>Some services may require personal data to be transferred or accessed outside the United Kingdom.</p>
            <p>For example: OCI or e-Visa information may need to be submitted to Indian government or official systems. Apostille or legalisation services may involve overseas authorities or third-party providers. Technology providers may store or access data outside the UK. Support teams or processors may access data from outside the UK where permitted.</p>
            <p>Where international transfers are restricted transfers under UK GDPR, FlyOCI will take appropriate steps designed to protect the data. This may include using UK adequacy regulations, standard contractual clauses, the UK International Data Transfer Agreement, the UK Addendum, transfer risk assessments or other lawful transfer mechanisms as applicable. ICO guidance explains that UK GDPR rules apply where personal information is transferred or made accessible to separate organisations outside the UK.</p>
          </SectionCard>

          <SectionCard id="security" title="11. Data Security">
            <p>FlyOCI uses appropriate technical and organisational measures to protect personal data.</p>
            <p>These may include: Secure portal access, Access controls, Password-protected systems, Role-based staff access, Secure document storage, Encryption where available, Audit logs where available, Staff confidentiality obligations, Restricted access to customer files, Malware and virus protection, Secure deletion processes, Supplier checks where appropriate, Internal data handling procedures.</p>
            <p>No online system, email platform, portal or communication method is completely risk-free. Customers should use secure upload methods where available and avoid sending sensitive documents through unsecured channels unless necessary.</p>
          </SectionCard>

          <SectionCard id="customer-resp" title="12. Customer Responsibilities for Data Security">
            <p>You should: Upload documents through secure portal methods where available, Avoid sending sensitive documents through public or shared devices, Keep your portal login secure, Tell us immediately if your email or portal access is compromised, Avoid sharing your file number publicly, Ensure documents are sent only to official FlyOCI contact details, Check that email addresses and phone numbers are correct before sending documents.</p>
            <p>FlyOCI is not responsible for data loss or unauthorised access caused by customer error, insecure customer devices, compromised customer email accounts or documents sent to the wrong contact details by the customer.</p>
          </SectionCard>

          <SectionCard id="retention" title="13. Data Retention">
            <p>FlyOCI keeps personal data only for as long as reasonably necessary.</p>
            <div className="overflow-hidden rounded-2xl border border-blue-100">
              <div className="grid grid-cols-1 gap-0 bg-[#DBEAFE] px-4 py-3 text-[13px] font-semibold text-slate-900 md:grid-cols-2">
                <div>Data type</div>
                <div>Typical retention period</div>
              </div>
              {[
                ["Basic enquiry data where no service is purchased", "Up to 12 months"],
                ["Customer file and application records", "Up to 6 years after service completion"],
                ["Payment and accounting records", "Up to 6 years"],
                ["Complaint and dispute records", "Up to 6 years"],
                ["Marketing consent records", "Until withdrawn or no longer required"],
                ["Website analytics data", "According to cookie/analytics settings"],
                ["Security logs", "As long as reasonably needed for security and fraud prevention"],
              ].map(([type, retention], index) => (
                <div key={type as string} className={`grid grid-cols-1 gap-0 px-4 py-3 text-[14px] text-slate-700 md:grid-cols-2 ${index % 2 === 0 ? "bg-white" : "bg-[#F0F9FF]"}`}>
                  <div>{type}</div>
                  <div>{retention}</div>
                </div>
              ))}
            </div>
            <p>We may keep data for longer where required by law, legal claims, fraud prevention, regulatory requirements, accounting rules, dispute resolution or enforcement of our terms. Where data is no longer required, we will delete, anonymise or securely archive it.</p>
          </SectionCard>

          <SectionCard id="rights" title="14. Your Rights">
            <p>Under UK data protection law, you may have the right to: Access your personal data, Correct inaccurate data, Request deletion of your data, Restrict processing, Object to processing, Request data portability, Withdraw consent where processing is based on consent, Complain to the Information Commissioner's Office.</p>
            <p>These rights are not absolute. We may refuse or limit a request where the law allows, such as where we need to retain data for legal, accounting, fraud prevention, contractual or dispute purposes.</p>
            <p>To exercise your rights, contact:</p>
            <p><strong>Email:</strong> [insert privacy email]</p>
            <p>We may need to verify your identity before responding.</p>
          </SectionCard>

          <SectionCard id="access" title="15. Right of Access">
            <p>You may request a copy of personal data we hold about you. We may ask for proof of identity and additional details to locate your information. We will respond within the legal timeframe unless an extension is permitted by law.</p>
          </SectionCard>

          <SectionCard id="rectification" title="16. Right to Rectification">
            <p>You may ask us to correct inaccurate or incomplete personal data. For application-related services, you must tell us immediately if any personal detail, passport detail, address, travel date or document changes. FlyOCI is not responsible for application errors caused by inaccurate information provided by the customer.</p>
          </SectionCard>

          <SectionCard id="erasure" title="17. Right to Erasure">
            <p>You may ask us to delete your personal data. We may not be able to delete data where we need to keep it for: Contract performance, Accounting records, Tax records, Legal claims, Complaint handling, Fraud prevention, Regulatory compliance, Security records, Evidence of service provided. If deletion is not possible, we will explain why where legally permitted.</p>
          </SectionCard>

          <SectionCard id="marketing" title="18. Marketing">
            <p>FlyOCI may send service-related messages about your file, application, document review, payment, upload, missing documents or account. These are not marketing messages. We may send marketing messages only where permitted by law. You can opt out of marketing at any time by using the unsubscribe link or contacting us. FlyOCI does not sell personal data to third-party advertisers.</p>
          </SectionCard>

          <SectionCard id="cookies" title="19. Cookies">
            <p>FlyOCI may use cookies and similar technologies to: Make the website work, Keep the website secure, Remember preferences, Improve performance, Analyse website traffic, Understand user behaviour, Improve services, Support marketing where consent is given.</p>
            <p>Essential cookies may be used without consent where necessary for the website to function. Non-essential cookies will be used only where legally permitted, including where consent is required. A separate Cookie Policy may be published on our website.</p>
          </SectionCard>

          <SectionCard id="payments" title="20. Payment Providers">
            <p>Payments may be processed by third-party payment providers. FlyOCI does not normally store full card numbers. Payment providers may process your data under their own terms and privacy policies.</p>
          </SectionCard>

          <SectionCard id="messaging" title="21. WhatsApp, Email and Messaging Platforms">
            <p>If you communicate with FlyOCI through WhatsApp, email, SMS or other messaging platforms, your data may also be processed by those service providers. For sensitive documents, FlyOCI may ask you to use the secure portal instead of ordinary messaging. Customers should avoid sending sensitive documents through insecure channels unless necessary.</p>
          </SectionCard>

          <SectionCard id="others" title="22. Providing Data About Other People">
            <p>If you provide personal data about another person, including a child, spouse, parent, relative or applicant, you confirm that: You have authority or permission to provide the data. The information is accurate. The person has been told their data will be shared with FlyOCI where appropriate. You have directed them to this Privacy Policy where appropriate. You must not provide personal data about another person without lawful authority or permission.</p>
          </SectionCard>

          <SectionCard id="fraud" title="23. Fraud Prevention">
            <p>FlyOCI may use personal data to detect, prevent and investigate fraud, forged documents, identity misuse, payment abuse, chargeback abuse or unlawful activity. Where necessary, we may share relevant data with payment providers, professional advisers, fraud prevention bodies, regulators, law enforcement or government authorities.</p>
          </SectionCard>

          <SectionCard id="breaches" title="24. Data Breaches">
            <p>If FlyOCI becomes aware of a personal data breach, we will assess the risk and take appropriate action. Where required by law, we will notify the Information Commissioner's Office and/or affected individuals.</p>
          </SectionCard>

          <SectionCard id="complaints" title="25. Complaints">
            <p>If you are unhappy with how FlyOCI handles your personal data, contact us first:</p>
            <p><strong>Email:</strong> support@flyoci.com</p>
            <p>You also have the right to complain to the UK Information Commissioner's Office.</p>
            <p><strong>Information Commissioner's Office</strong></p>
            <p>Website: ico.org.uk</p>
            <p>Phone: 0303 123 1113</p>
          </SectionCard>

          <SectionCard id="changes" title="26. Changes to This Privacy Policy">
            <p>FlyOCI may update this Privacy Policy from time to time. The latest version will be published on our website. Where changes are significant, we may take additional steps to notify customers.</p>
          </SectionCard>

          <SectionCard id="contact" title="27. Contact Details">
            <p>For privacy questions, data requests or complaints:</p>
            <p><strong>FlyOCI Privacy Team</strong></p>
            <p><strong>Legal name:</strong> FlyOCI Limited</p>
            <p><strong>Email:</strong> support@flyoci.com</p>
            <p><strong>Address:</strong> 71A Thurlby Road, Wembley, HA0 4RT</p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}