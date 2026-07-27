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

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 scroll-smooth" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="border-b border-blue-100 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <Image src="/logo.png" alt="FlyOCI" width={150} height={50} className="h-10 w-auto" priority />
          <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-slate-700">
            Terms & Conditions
          </div>
        </div>
      </header>

      <section className="border-b border-blue-100 bg-[#F8FBFF]">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-[3.5rem]">
              FlyOCI Terms and Conditions
            </h1>
            <Pill>
              Last updated: <span className="text-lg md:text-xl">26/05/2026</span>
            </Pill>
          </div>
          <div className="mt-8 max-w-none space-y-4">
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              These Terms and Conditions apply to the website www.flyoci.com and to all services provided by FlyOCI Limited, trading as FlyOCI, a company registered in England and Wales under company number 16856950, with registered office at 71A Thurlby Road, Wembley, HA0 4RT.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              By using our website, submitting an enquiry, generating a file number, uploading documents, making payment, using our customer portal, communicating with our team, or instructing FlyOCI to begin work, you agree to these Terms and Conditions.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              Please read these Terms carefully before using our services.
            </p>
          </div>
        </div>
      </section>

      <div className="w-full px-4 py-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <SectionCard id="about" title="1. About FlyOCI">
            <p>FlyOCI is a UK-based private document assistance and application support service.</p>
            <p>We assist customers with administrative support, document checking, form preparation, file organisation, process guidance and related support for services including:</p>
            <BulletList
              items={[
                "Overseas Citizen of India (OCI) new applications",
                "OCI renewal, re-issue or miscellaneous update services",
                "OCI Gratis or update-related assistance",
                "Indian e-Visa assistance",
                "Apostille and document legalisation assistance",
                "Document pre-checks and application audits",
                "Supporting document preparation and review",
                "Customer file management and application tracking support",
              ]}
            />
            <p>FlyOCI is not a government body and is not part of, authorised by, endorsed by, or connected with the Government of India, Indian High Commission, Indian Consulate, VFS Global, Ministry of External Affairs, FCDO, HM Passport Office, UK Home Office, or any other official authority.</p>
            <p>Customers may apply directly through the relevant official government or authorised portal without using FlyOCI. FlyOCI charges a service fee for private assistance, document review, administrative handling, customer support, workflow management and related services.</p>
          </SectionCard>

          <SectionCard id="definitions" title="2. Definitions">
            <BulletList
              items={[
                "FlyOCI, we, us, our means FlyOCI Limited, trading as FlyOCI.",
                "Customer, you, your means the person using our website, submitting documents, making payment, or purchasing a service.",
                "Applicant means the person for whom the application, document check, e-Visa, OCI, apostille, or related service is being prepared.",
                "Service means any assistance provided by FlyOCI, including document checking, file creation, form support, document preparation, application guidance, administrative handling, customer support, portal access, tracking assistance, apostille support, e-Visa support or OCI support.",
                "File number means the internal FlyOCI reference number generated for tracking your case.",
                "Pre-check, audit or document review means FlyOCI’s review of documents and information to identify missing, unclear, inconsistent, expired or potentially unsuitable documents.",
                "Government fee means a fee charged by a government authority, consular authority, VFS Global, apostille authority, payment provider, courier company or other third party.",
                "Service fee means the amount charged by FlyOCI for our own work and assistance.",
                "Third party means any organisation outside FlyOCI involved in the service, including official portals, government bodies, VFS Global, payment processors, courier companies, translation providers, notaries, solicitors, apostille providers, IT systems, hosting providers and document storage providers.",
              ]}
            />
          </SectionCard>

          <SectionCard id="nature" title="3. Nature of Our Service">
            <p>FlyOCI provides administrative and document support. Depending on the service purchased, our work may include:</p>
            <BulletList
              items={[
                "Creating a customer file",
                "Generating and assigning a FlyOCI file number",
                "Reviewing documents uploaded by the customer",
                "Checking whether documents appear complete, readable and suitable",
                "Identifying missing documents or obvious inconsistencies",
                "Advising on common document requirements",
                "Preparing customer information for an application",
                "Assisting with completion of forms based on information provided by the customer",
                "Organising documents for submission",
                "Guiding customers through the next step of the process",
                "Assisting with upload or submission where authorised",
                "Supporting appointment, payment or tracking steps where applicable",
                "Providing customer communication through email, phone, WhatsApp, SMS or portal",
                "Supporting apostille/legalisation workflows where applicable",
              ]}
            />
            <p>FlyOCI does not guarantee that any application, visa, OCI, apostille, document legalisation, government submission or official request will be accepted, approved or completed within any specific time.</p>
            <p>The final decision always rests with the relevant government body, consular authority, VFS Global, apostille authority or third-party provider.</p>
          </SectionCard>

          <SectionCard id="no-advice" title="4. No Legal, Immigration or Government Advice">
            <p>FlyOCI provides administrative assistance only. We do not provide regulated immigration advice, legal advice, nationality law advice, tax advice, financial advice, or official government advice.</p>
            <p>Information on our website is general guidance only. It must not be treated as legal advice or as a guarantee that your application will succeed.</p>
            <p>You should seek advice from a qualified solicitor, immigration adviser, legal professional or relevant authority if your matter involves:</p>
            <BulletList
              items={[
                "Previous refusal or rejection",
                "Criminal record",
                "Immigration breach",
                "Nationality dispute",
                "Name discrepancy",
                "Date of birth discrepancy",
                "Adoption",
                "Surrogacy",
                "Child custody issue",
                "Court order",
                "Divorce or separation",
                "Parental consent dispute",
                "Missing parent details",
                "Previous Indian passport issue",
                "Surrender certificate issue",
                "Lost passport issue",
                "Complex nationality or citizenship history",
                "Any other legal complication",
              ]}
            />
            <p>FlyOCI may decline to assist, pause work, or recommend that you obtain legal advice if your case appears complex or outside our administrative scope.</p>
          </SectionCard>

          <SectionCard id="customer-responsibility" title="5. Customer Responsibility">
            <p>You are fully responsible for ensuring that all information and documents provided to FlyOCI are true, complete, accurate, valid, lawful and up to date.</p>
            <p>You must ensure that:</p>
            <BulletList
              items={[
                "Names are spelled correctly",
                "Dates of birth are accurate",
                "Passport numbers and expiry dates are correct",
                "Travel dates are accurate",
                "Nationality details are correct",
                "Parent, spouse and child details are correct",
                "Uploaded documents are genuine and legally obtained",
                "Uploaded documents are clear, complete and readable",
                "You have authority to provide information about any applicant, child, spouse, parent or third party",
                "You carefully review any form, summary, draft, upload or declaration before submission",
                "You respond promptly to requests from FlyOCI",
                "You comply with all requirements of the relevant authority",
              ]}
            />
            <p>FlyOCI is not responsible for any loss, delay, rejection, refusal, additional fee, missed appointment, missed travel date or other consequence caused by incorrect, incomplete, false, misleading, expired, unclear, late or inconsistent information provided by you.</p>
          </SectionCard>

          <SectionCard id="workflow" title="6. FlyOCI Workflow">
            <p>The FlyOCI workflow may include some or all of the following steps:</p>
            <BulletList
              items={[
                "Customer selects a service on the FlyOCI website.",
                "Customer enters basic applicant and contact details.",
                "FlyOCI generates a file number or reference number.",
                "Customer confirms the file number where required.",
                "Customer makes payment where applicable.",
                "Customer uploads required documents through the portal, form, email or other approved method.",
                "FlyOCI reviews the uploaded documents.",
                "FlyOCI may mark documents as accepted, missing, unclear, incomplete or requiring correction.",
                "Customer provides missing or corrected documents.",
                "FlyOCI prepares the application or document pack where applicable.",
                "Customer reviews and confirms information before submission where required.",
                "FlyOCI assists with submission, appointment, tracking or next-step guidance where included in the service.",
                "Customer remains responsible for attending appointments, sending physical documents, signing declarations or completing actions required by the relevant authority.",
              ]}
            />
            <p>Not every service includes every step. The exact workflow depends on the service purchased.</p>
          </SectionCard>

          <SectionCard id="upload-rules" title="7. Document Upload Rules">
            <p>Documents uploaded to FlyOCI must be:</p>
            <BulletList
              items={[
                "Clear",
                "Complete",
                "In colour where required",
                "Not cropped",
                "Not blurred",
                "Not password-protected unless the password is provided separately",
                "Not edited in a misleading way",
                "In the correct file format",
                "Valid and current unless an expired document is specifically requested",
                "Uploaded within the required timeframe",
              ]}
            />
            <p>FlyOCI may reject or request replacement documents if they are unclear, incomplete, unreadable, expired, inconsistent or unsuitable. Processing may be delayed if documents are not uploaded correctly.</p>
          </SectionCard>

          <SectionCard id="precheck" title="8. Document Review and Pre-Check Limitations">
            <p>FlyOCI’s document review or pre-check is designed to identify common issues such as missing documents, unclear scans, expired documents, name differences, incomplete pages or obvious inconsistencies.</p>
            <p>A document being marked as “accepted”, “checked”, “reviewed”, “ready”, “suitable” or similar by FlyOCI does not mean that the relevant government body, VFS Global, consulate, apostille authority or third party will accept it.</p>
            <p>FlyOCI’s review is not a legal opinion and is not a guarantee of approval.</p>
            <p>Official authorities may apply their own discretion, request additional documents, reject a document, change requirements or refuse an application.</p>
          </SectionCard>

          <SectionCard id="discrepancies" title="9. Name Differences and Document Discrepancies">
            <p>Applications may be delayed, rejected or require additional evidence if there are differences in:</p>
            <BulletList
              items={[
                "First name",
                "Middle name",
                "Surname",
                "Maiden name",
                "Married name",
                "Parent names",
                "Spouse names",
                "Date of birth",
                "Place of birth",
                "Passport details",
                "Address details",
                "Nationality records",
                "Previous Indian passport details",
                "Birth certificate details",
                "Marriage certificate details",
                "Naturalisation records",
              ]}
            />
            <p>Where discrepancies exist, additional evidence may be required. This may include affidavits, declarations, apostilled documents, translations, marriage certificates, divorce documents, deed poll records, court orders, consent letters or other supporting documents.</p>
            <p>FlyOCI may provide general guidance, but acceptance of such documents is always decided by the relevant authority.</p>
          </SectionCard>

          <SectionCard id="minors" title="10. Minor Applicants and Parental Responsibility">
            <p>Where an application relates to a child or minor, the adult submitting the information confirms that they have parental responsibility, legal authority or appropriate consent to act on behalf of the child.</p>
            <p>FlyOCI may request additional documents for minors, including but not limited to:</p>
            <BulletList items={[
              "Birth certificate",
              "Parent passports",
              "Consent forms",
              "Custody documents",
              "Court orders",
              "Address evidence",
              "Marriage or divorce documents",
              "Name change documents",
            ]} />
            <p>FlyOCI may refuse or pause work if parental authority, consent or child-related documentation is unclear.</p>
          </SectionCard>

          <SectionCard id="portal" title="11. Customer Portal and Account Security">
            <p>Where FlyOCI provides access to a customer portal, you must keep your login details secure.</p>
            <p>You must not share your account login with unauthorised persons.</p>
            <p>You are responsible for activity carried out through your account unless caused by FlyOCI’s failure to use reasonable security measures.</p>
            <p>You must notify us immediately if you suspect unauthorised access.</p>
            <p>FlyOCI may suspend or restrict portal access where we suspect fraud, misuse, security risk, unauthorised access or breach of these Terms.</p>
          </SectionCard>

          <SectionCard id="communication" title="12. Communication Methods">
            <p>FlyOCI may communicate with you by:</p>
            <BulletList items={["Email", "Phone", "SMS", "WhatsApp", "Customer portal", "Online form", "Letter", "Any other contact method provided by you"]} />
            <p>You are responsible for checking your messages, email inbox, spam folder, phone, WhatsApp and customer portal regularly.</p>
            <p>FlyOCI is not responsible for delays caused by incorrect contact details, missed messages, spam filtering, full inboxes, unavailable phone numbers or failure to respond.</p>
          </SectionCard>

          <SectionCard id="prices" title="13. Prices and Fees">
            <p>Prices displayed on our website or quoted to you may include one or more of the following:</p>
            <BulletList items={["FlyOCI service fee", "Government fee", "VFS fee", "Consular fee", "Apostille fee", "Courier fee", "Translation fee", "Notary fee", "Payment processing fee", "Third-party provider fee"]} />
            <p>Where a price includes third-party or government fees, this will be stated where possible.</p>
            <p>Where a price excludes third-party or government fees, you are responsible for paying those fees separately.</p>
            <p>FlyOCI may change prices at any time. Price changes will not affect services already purchased unless additional work, additional services or additional third-party fees are required.</p>
          </SectionCard>

          <SectionCard id="third-party" title="14. Third-Party and Government Fees">
            <p>Government fees, VFS fees, consular fees, courier fees, apostille fees, payment processor fees and other third-party fees are outside FlyOCI’s control.</p>
            <p>Such fees may change without notice.</p>
            <p>FlyOCI is not responsible for:</p>
            <BulletList items={["Government fee changes", "VFS fee changes", "Exchange rate differences", "Payment portal failure", "Bank charges", "Third-party refund refusal", "Courier loss or delay", "Appointment availability", "Government or consular processing delays"]} />
            <p>Once third-party or government fees are paid or incurred, they are usually non-refundable unless the relevant third party refunds them.</p>
          </SectionCard>

          <SectionCard id="payment" title="15. Payment">
            <p>Payment must be made through the payment method approved by FlyOCI.</p>
            <p>FlyOCI may pause or refuse to begin work until payment is received and cleared.</p>
            <p>Where a payment fails, is reversed, is disputed, or appears fraudulent, FlyOCI may:</p>
            <BulletList items={["Pause work", "Suspend portal access", "Cancel the service", "Request alternative payment", "Recover unpaid fees", "Provide evidence to the payment provider", "Take reasonable steps to protect its legal rights"]} />
          </SectionCard>

          <SectionCard id="starting-work" title="16. Starting Work Immediately">
            <p>By making payment, uploading documents, confirming your file number, requesting urgent action, submitting application information or instructing us to proceed, you authorise FlyOCI to begin work on your case.</p>
            <p>This may include creating your file, reviewing documents, checking details, preparing forms, communicating with you, uploading information, reviewing eligibility information, preparing application packs, making third-party arrangements and providing support through our team or systems.</p>
            <p>If you ask us to start work during the 14-day cancellation period, you agree that we may charge for work already completed if you later cancel.</p>
            <p>If the service is fully completed after you requested work to begin, you may lose the right to cancel that service.</p>
          </SectionCard>

          <SectionCard id="processing-times" title="17. Processing Times">
            <p>Any processing times shown on our website or provided by FlyOCI are estimates only.</p>
            <p>Processing times may depend on customer response time, document quality, case complexity, government processing times, VFS appointment availability, courier delays, official portal availability, public holidays, consular workload, apostille provider workload, additional document requests, rule changes, security checks and payment delays.</p>
            <p>FlyOCI does not guarantee any application decision date, appointment date, visa issue date, OCI issue date, document return date, apostille completion date or courier delivery date.</p>
          </SectionCard>

          <SectionCard id="submission" title="18. Submission and Customer Approval">
            <p>Where FlyOCI prepares information for submission, the customer must check and approve the information before submission where requested.</p>
            <p>Once an application is submitted, changes may not be possible.</p>
            <p>If incorrect information is submitted because the customer provided incorrect details or approved incorrect information, FlyOCI is not responsible for resulting delays, refusals, rejections, extra costs or fresh application requirements.</p>
          </SectionCard>

          <SectionCard id="approval" title="19. Approval Not Guaranteed">
            <p>FlyOCI does not guarantee:</p>
            <BulletList items={["OCI approval", "OCI card issue", "e-Visa approval", "Apostille completion", "Document acceptance", "Appointment availability", "Processing within a certain timeframe", "Government refund", "Third-party refund", "Acceptance of photograph", "Acceptance of signature", "Acceptance of uploaded documents", "Acceptance of name discrepancy evidence", "Any particular outcome"]} />
            <p>Our service fee is charged for the work we perform, not for a guaranteed result.</p>
          </SectionCard>

          <SectionCard id="delays" title="20. Refusals, Rejections, Delays and Additional Documents">
            <p>Applications may be refused, rejected, delayed, returned, queried or placed on hold for reasons outside FlyOCI’s control, including incorrect customer information, missing documents, unclear documents, name discrepancies, date discrepancies, passport issues, previous Indian passport or surrender certificate issues, minor consent issues, photograph rejection, signature mismatch, government rule changes, technical portal issues, security checks, official discretion, prior visa or immigration history, incomplete customer response, failure to attend appointment or failure to send physical documents.</p>
            <p>FlyOCI service fees remain payable for work already completed even if the application is delayed, rejected, refused, returned, queried or requires additional documents.</p>
          </SectionCard>

          <SectionCard id="apostille" title="21. Apostille and Legalisation Services">
            <p>Where FlyOCI assists with apostille or document legalisation, we may rely on third-party legalisation providers, solicitors, notaries, courier providers or official bodies.</p>
            <p>FlyOCI is not responsible for delays or refusal caused by documents not being eligible for apostille, documents being laminated, damaged, altered or unclear, missing certification, wrong document type, third-party provider delay, courier delay, official authority rejection, or a requirement for notarisation, solicitor certification or translation.</p>
            <p>Additional fees may apply if extra certification, notarisation, translation, courier or legalisation steps are required.</p>
          </SectionCard>

          <SectionCard id="evisa" title="22. e-Visa Services">
            <p>Where FlyOCI assists with an e-Visa application, the customer remains responsible for ensuring that travel dates are correct, passport validity is sufficient, passport details are accurate, nationality details are correct, purpose of travel is correct, photograph and passport scan meet official requirements, all declarations are accurate and the applicant is eligible for the visa type requested.</p>
            <p>FlyOCI is not responsible for refusal, delay, incorrect approval details or travel disruption caused by customer error, official decision, airline decision, border control decision or government system issue.</p>
          </SectionCard>

          <SectionCard id="oci" title="23. OCI Services">
            <p>Where FlyOCI assists with OCI applications, the customer remains responsible for ensuring that all personal, nationality, passport, family, previous Indian passport and supporting document information is accurate.</p>
            <p>FlyOCI is not responsible for refusal, rejection, delay or additional document requests caused by previous Indian passport issues, missing surrender certificate, name mismatch, parent name mismatch, marriage record issue, divorce or custody issue, minor consent issue, naturalisation date issue, nationality or eligibility issue, or official authority discretion.</p>
          </SectionCard>

          <SectionCard id="automation" title="24. Use of AI, Automation and Staff Review">
            <p>FlyOCI may use software tools, workflow automation, CRM systems, document management systems, checklists, AI-assisted review tools or internal automation to improve speed, consistency and customer service.</p>
            <p>AI or automation may assist staff but does not replace customer responsibility to provide accurate information.</p>
            <p>FlyOCI does not make official government decisions. Official decisions are made only by the relevant authority.</p>
          </SectionCard>

          <SectionCard id="refusal" title="25. Refusal of Service">
            <p>FlyOCI may refuse, pause, suspend or cancel service where documents appear false, altered, forged or suspicious, information appears misleading or inconsistent, payment fails or is disputed, customer behaves abusively toward staff, customer refuses to provide required information, customer requests illegal or unethical action, case appears outside FlyOCI’s administrative scope, required consent or authority is not provided, or continuing the service may create legal, regulatory, security or reputational risk.</p>
            <p>Where service is refused after work has started, FlyOCI may deduct reasonable charges for work already completed and costs already incurred.</p>
          </SectionCard>

          <SectionCard id="prohibited" title="26. Prohibited Use">
            <p>You must not use FlyOCI’s website, portal or services to:</p>
            <BulletList items={["Upload false, forged, altered or misleading documents", "Impersonate another person", "Provide personal data without authority", "Submit illegal material", "Attempt unauthorised access", "Interfere with our systems", "Upload malware or harmful files", "Harass or threaten staff", "Copy, scrape or reproduce website content", "Use our service for fraudulent or unlawful activity"]} />
            <p>FlyOCI may report suspected fraud, forged documents or unlawful activity to relevant authorities.</p>
          </SectionCard>

          <SectionCard id="content" title="27. Website Content">
            <p>Website content is provided for general information only. Although we try to keep information accurate and updated, government rules, fees, forms, official requirements and processing times may change without notice.</p>
            <p>FlyOCI does not guarantee that all website information will always be complete, current or error-free. The customer should always check final official requirements before submission or travel.</p>
          </SectionCard>

          <SectionCard id="ip" title="28. Intellectual Property">
            <p>All website content, branding, design, logos, text, workflows, checklists, forms, graphics, service descriptions, portal structure and business processes belong to FlyOCI or its licensors.</p>
            <p>You may use the website for personal use only. You must not copy, reproduce, sell, distribute, modify, scrape or exploit our content without written permission.</p>
          </SectionCard>

          <SectionCard id="links" title="29. Third-Party Links">
            <p>Our website may contain links to official portals or third-party websites.</p>
            <p>FlyOCI is not responsible for the content, accuracy, privacy practices, security, availability, pricing or performance of third-party websites.</p>
            <p>You should read the terms and privacy policies of any third-party website before using it.</p>
          </SectionCard>

          <SectionCard id="liability" title="30. Limitation of Liability">
            <p>Nothing in these Terms limits liability where it would be unlawful to do so, including liability for death or personal injury caused by negligence, fraud, fraudulent misrepresentation or breach of rights that cannot legally be excluded.</p>
            <p>Subject to the above, FlyOCI is not liable for application refusal, application rejection, government delay, VFS delay, courier delay, appointment unavailability, portal failure, rule changes, customer error, missed travel date, loss of profit, loss of business, loss of opportunity, indirect loss, consequential loss, third-party failure or government or authority decision.</p>
            <p>FlyOCI’s total liability for a service is limited to the FlyOCI service fee paid for that specific service, except where the law does not allow such limitation.</p>
          </SectionCard>

          <SectionCard id="force-majeure" title="31. Force Majeure">
            <p>FlyOCI is not responsible for delay or failure caused by events outside our reasonable control, including government system failure, official portal outage, VFS system issue, cyber incident, internet failure, hosting failure, courier disruption, strike, war, civil unrest, public health emergency, natural disaster, government policy change, payment provider failure, power outage or any other event outside our reasonable control.</p>
          </SectionCard>

          <SectionCard id="refunds" title="32. Cancellation and Refunds">
            <p>Cancellation and refund rights are explained in our Refund Policy, which forms part of these Terms.</p>
            <p>By purchasing a service, you agree to the Refund Policy.</p>
          </SectionCard>

          <SectionCard id="data-protection" title="33. Data Protection">
            <p>FlyOCI processes personal data in accordance with its Privacy Policy.</p>
            <p>By using our services, you understand that FlyOCI may process personal data, identity documents, passport information, nationality information, family information, payment information and application-related information to provide the requested service.</p>
          </SectionCard>

          <SectionCard id="complaints" title="34. Complaints">
            <p>If you are unhappy with our service, contact us first so we can investigate.</p>
            <p>Email: [insert complaints email]</p>
            <p>Phone: +44 20 7808 6162</p>
            <p>Address: [insert address]</p>
            <p>Please include full name, applicant name, file number, service purchased, date of purchase, details of complaint and what outcome you are seeking.</p>
            <p>We aim to acknowledge complaints within 3 working days and respond within 14 working days, although complex complaints may take longer.</p>
          </SectionCard>

          <SectionCard id="changes" title="35. Changes to These Terms">
            <p>FlyOCI may update these Terms from time to time. The latest version will be available on our website.</p>
            <p>The Terms in force at the time of purchase will normally apply to that purchase, unless a change is required by law or regulation.</p>
          </SectionCard>

          <SectionCard id="law" title="36. Governing Law and Jurisdiction">
            <p>These Terms are governed by the laws of England and Wales. The courts of England and Wales shall have jurisdiction, subject to any mandatory consumer rights that apply.</p>
          </SectionCard>

          <SectionCard id="contact" title="37. Contact Details">
            <p>FlyOCI</p>
            <p>Legal name: FlyOCI Limited</p>
            <p>Company number: 16856950</p>
            <p>Registered office: 71A Thurlby Road, Wembley, HA0 4RT</p>
            <p>Email: support@flyoci.com</p>
            <p>Website: www.flyoci.com</p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
