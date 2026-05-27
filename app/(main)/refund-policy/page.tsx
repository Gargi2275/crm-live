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

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 scroll-smooth" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <header className="border-b border-blue-100 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <Image src="/logo.png" alt="FlyOCI" width={150} height={50} className="h-10 w-auto" priority />
          <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-slate-700">
            Refund Policy
          </div>
        </div>
      </header>

      <section className="border-b border-blue-100 bg-[#F8FBFF]">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-[3.5rem]">
              FlyOCI Refund Policy
            </h1>
            <Pill>
              Last updated: <span className="text-lg md:text-xl">26/05/2026</span>
            </Pill>
          </div>
          <div className="mt-8 space-y-4">
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              This Refund Policy explains when refunds may be available for services purchased from FlyOCI Limited, trading as FlyOCI.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              FlyOCI is a UK-based private document assistance and application support provider. Our fees are charged for our time, document review, file management, administrative work, customer support, workflow handling, preparation and related assistance.
            </p>
            <p className="text-[16px] leading-8 text-slate-700 md:text-[17px]">
              This policy forms part of our Terms and Conditions.
            </p>
          </div>
        </div>
      </section>

      <div className="w-full px-4 py-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <SectionCard id="key-principle" title="1. Key Principle">
            <p>FlyOCI charges for work performed, not for a guaranteed application outcome.</p>
            <p>Government bodies, consulates, VFS Global, apostille authorities, payment providers, courier companies and other third parties make their own decisions and operate their own processes.</p>
            <p>Therefore, FlyOCI service fees are not automatically refundable because an application is delayed, refused, rejected, queried, returned or requires further documents.</p>
          </SectionCard>

          <SectionCard id="14-day-cancellation-right" title="2. 14-Day Cancellation Right">
            <p>If you buy a service online, by phone, by email, WhatsApp or other distance method, you may have a legal right to cancel within 14 days of the contract being made.</p>
            <p>This 14-day cancellation period begins the day after your order is confirmed.</p>
            <p>However, where you ask FlyOCI to start work during the 14-day period, you agree that:</p>
            <BulletList
              items={[
                "FlyOCI may begin work immediately.",
                "FlyOCI may charge for work completed before cancellation.",
                "FlyOCI may deduct reasonable costs from any refund.",
                "If the service is fully completed after your express request to begin, you may lose the right to cancel that service.",
              ]}
            />
            <p>This is because FlyOCI provides personalised services, including document review, file creation, form preparation, case handling and customer-specific administrative work.</p>
          </SectionCard>

          <SectionCard id="express-agreement" title="3. Express Agreement to Start Work">
            <p>You are treated as asking FlyOCI to begin work when you do any of the following:</p>
            <BulletList
              items={[
                "Make payment",
                "Submit applicant details",
                "Confirm or use your file number",
                "Upload documents",
                "Request urgent processing",
                "Request document review",
                "Ask us to proceed by email, WhatsApp, phone, portal or form",
                "Ask us to prepare an application",
                "Ask us to check missing documents",
                "Ask us to support submission or next steps",
              ]}
            />
            <p>Once work starts, the refund amount may be reduced.</p>
          </SectionCard>

          <SectionCard id="what-counts" title="4. What Counts as Work Started">
            <p>Work may include:</p>
            <BulletList
              items={[
                "Creating your customer file",
                "Generating a file number",
                "Reviewing documents",
                "Checking names, dates, passport details or application details",
                "Reviewing eligibility-related information",
                "Communicating with you",
                "Preparing checklists",
                "Preparing forms",
                "Preparing document packs",
                "Uploading information",
                "Reviewing missing or unclear documents",
                "Giving document guidance",
                "Liaising with third-party providers",
                "Making internal notes",
                "Assigning staff time",
                "Using software, portal or automation resources",
                "Making government or third-party payments",
                "Booking or preparing external services",
              ]}
            />
            <p>Work does not need to result in submission to count as work performed.</p>
          </SectionCard>

          <SectionCard id="full-refunds" title="5. Full Refunds">
            <p>A full refund of FlyOCI’s service fee may be available if:</p>
            <BulletList
              items={[
                "You cancel before FlyOCI has started any work.",
                "You paid twice by mistake.",
                "FlyOCI cancels your service before starting work.",
                "FlyOCI is unable to provide the purchased service due to a reason caused by FlyOCI.",
                "A payment error occurred and no service was provided.",
              ]}
            />
            <p>A full refund does not include third-party fees already paid, charged or incurred unless those third-party amounts are refunded to FlyOCI.</p>
          </SectionCard>

          <SectionCard id="partial-refunds" title="6. Partial Refunds">
            <p>A partial refund may be available if:</p>
            <BulletList
              items={[
                "You cancel after work has started but before the service is completed.",
                "FlyOCI has reviewed some documents but not completed the full service.",
                "FlyOCI has prepared part of the application but not completed the full service.",
                "FlyOCI has performed administrative work but no third-party fee has yet been paid.",
                "FlyOCI agrees that a partial refund is fair in the circumstances.",
              ]}
            />
            <p>FlyOCI may deduct reasonable charges for:</p>
            <BulletList
              items={[
                "Staff time",
                "File creation",
                "Document review",
                "Communication",
                "Form preparation",
                "Administrative handling",
                "Portal usage",
                "Software and processing costs",
                "Third-party charges",
                "Payment processor charges",
                "Work already completed",
              ]}
            />
          </SectionCard>

          <SectionCard id="non-refundable" title="7. Non-Refundable Situations">
            <p>FlyOCI service fees are normally non-refundable where:</p>
            <BulletList
              items={[
                "The service has been completed.",
                "You requested work to start and work has been fully performed.",
                "Your documents have been reviewed.",
                "Your application or document pack has been prepared.",
                "Your application has been submitted or prepared for submission.",
                "You received document guidance and then decided not to proceed.",
                "You changed your mind after work started.",
                "You no longer require the service.",
                "You found a cheaper provider.",
                "You submitted the application yourself after receiving FlyOCI guidance.",
                "You provided incorrect or incomplete information.",
                "You failed to provide required documents.",
                "You failed to respond to FlyOCI.",
                "You missed an appointment.",
                "You missed a deadline.",
                "Your travel plan changed.",
                "Your application was refused.",
                "Your application was rejected.",
                "Your application was delayed.",
                "The authority requested more documents.",
                "Government or VFS rules changed.",
                "Official portals were unavailable.",
                "Third-party providers caused delay.",
                "Your photograph, signature or document was rejected by an authority.",
                "You purchased the wrong service and work had already started.",
                "You failed to read the service description before purchase.",
              ]}
            />
          </SectionCard>

          <SectionCard id="government-fees" title="8. Government and Third-Party Fees">
            <p>The following fees are normally non-refundable once paid, submitted, booked, charged or incurred:</p>
            <BulletList
              items={[
                "Government fees",
                "VFS Global fees",
                "Consular fees",
                "OCI fees",
                "e-Visa fees",
                "Apostille fees",
                "Legalisation fees",
                "Courier fees",
                "Translation fees",
                "Notary fees",
                "Solicitor certification fees",
                "Appointment fees",
                "Payment processor charges",
                "Bank charges",
                "Any other third-party charges",
              ]}
            />
            <p>If a third party refunds an amount to FlyOCI, we will pass the refunded amount to you after deducting any reasonable costs, payment charges or administrative charges.</p>
            <p>FlyOCI cannot guarantee that any third party will issue a refund.</p>
          </SectionCard>

          <SectionCard id="oci-refunds" title="9. OCI Refunds">
            <p>For OCI-related services, FlyOCI fees are charged for administrative support, document review, preparation and customer assistance.</p>
            <p>FlyOCI service fees are not refundable simply because:</p>
            <BulletList
              items={[
                "OCI is refused",
                "OCI is delayed",
                "OCI is rejected",
                "OCI is returned for correction",
                "VFS refuses a document",
                "The consulate requests further documents",
                "A surrender certificate is missing",
                "Previous Indian passport details are missing",
                "There is a name mismatch",
                "A minor consent issue arises",
                "A customer becomes ineligible",
                "Government requirements change",
              ]}
            />
          </SectionCard>

          <SectionCard id="evisa-refunds" title="10. e-Visa Refunds">
            <p>For e-Visa services, FlyOCI fees are charged for assistance with form preparation, document checking and administrative handling.</p>
            <p>FlyOCI service fees are not refundable simply because:</p>
            <BulletList
              items={[
                "e-Visa is refused",
                "e-Visa is delayed",
                "Customer travel date changes",
                "Customer provided incorrect passport details",
                "Customer selected wrong visa type",
                "Customer was not eligible",
                "Government system caused delay",
                "Airline or immigration authority refuses boarding or entry",
                "Customer did not check the visa details before travel",
              ]}
            />
            <p>Government e-Visa fees are normally non-refundable once paid.</p>
          </SectionCard>

          <SectionCard id="apostille-refunds" title="11. Apostille Refunds">
            <p>For apostille or legalisation services, FlyOCI fees are not refundable simply because:</p>
            <BulletList
              items={[
                "The document is not eligible for apostille",
                "The document needs notarisation first",
                "The document needs solicitor certification first",
                "The document is damaged, laminated, unclear or unsuitable",
                "A third-party provider delays the process",
                "A courier delays delivery",
                "The official authority rejects the document",
                "Additional legalisation steps are required",
              ]}
            />
            <p>Where third-party fees have already been paid or incurred, they are normally non-refundable.</p>
          </SectionCard>

          <SectionCard id="free-pre-check" title="12. Free Pre-Check and Paid Audit">
            <p>Where FlyOCI offers a free pre-check, it may be limited in scope and may not include full application preparation.</p>
            <p>A free pre-check does not guarantee approval, eligibility, submission or acceptance by any authority.</p>
            <p>Where FlyOCI charges for an audit, document review or pre-check, the audit fee is charged for the review work itself.</p>
            <p>Once the audit or document review has started, the fee is normally non-refundable.</p>
            <p>Where FlyOCI states that an audit fee is deductible from a later full-service fee, that deduction applies only if:</p>
            <BulletList
              items={[
                "The same applicant proceeds with the same service.",
                "The customer proceeds within the stated validity period.",
                "The audit fee was paid in full.",
                "FlyOCI confirms the deduction.",
                "The customer has not already received another discount or offer unless agreed.",
              ]}
            />
            <p>Audit fee credits are not transferable and have no cash value.</p>
          </SectionCard>

          <SectionCard id="urgent-fees" title="13. Urgent or Priority Fees">
            <p>Urgent or priority fees are charged for prioritising FlyOCI’s internal handling.</p>
            <p>They do not guarantee faster government, VFS, consular, apostille, courier or third-party processing.</p>
            <p>Urgent or priority fees are normally non-refundable once priority work has started.</p>
          </SectionCard>

          <SectionCard id="duplicate-payments" title="14. Duplicate Payments">
            <p>If you believe you paid twice by mistake, contact us immediately.</p>
            <p>Where duplicate payment is confirmed and no additional service was provided, FlyOCI will refund the duplicate payment.</p>
          </SectionCard>

          <SectionCard id="chargebacks" title="15. Chargebacks and Payment Disputes">
            <p>If you raise a chargeback or payment dispute without first contacting FlyOCI, we may:</p>
            <BulletList
              items={[
                "Pause your case",
                "Suspend portal access",
                "Stop all work",
                "Provide evidence of work completed to the payment provider",
                "Recover unpaid fees",
                "Deduct reasonable administrative costs where permitted by law",
              ]}
            />
            <p>Customers are encouraged to contact FlyOCI first to resolve payment issues quickly.</p>
          </SectionCard>

          <SectionCard id="refund-process" title="16. Refund Request Process">
            <p>To request a refund, email:</p>
            <p><strong>Email:</strong> support@flyoci.com</p>
            <p><strong>Subject:</strong> Refund Request – [File Number]</p>
            <p>Include:</p>
            <BulletList
              items={[
                "Full name",
                "Applicant name",
                "FlyOCI file number",
                "Service purchased",
                "Date of payment",
                "Amount paid",
                "Reason for refund request",
                "Payment confirmation if available",
              ]}
            />
            <p>We may ask for further information before making a decision.</p>
          </SectionCard>

          <SectionCard id="review-time" title="17. Refund Review Time">
            <p>FlyOCI aims to review refund requests within 14 working days.</p>
            <p>Complex cases may take longer if we need to check work completed, payment records, third-party charges or communication history.</p>
          </SectionCard>

          <SectionCard id="payment-time" title="18. Approved Refund Payment Time">
            <p>Where a refund is approved, FlyOCI aims to process it within 14 days of approval.</p>
            <p>Refunds are normally made to the original payment method.</p>
            <p>Your bank or payment provider may take additional time to show the funds in your account.</p>
          </SectionCard>

          <SectionCard id="abuse" title="19. Right to Refuse Refund Abuse">
            <p>FlyOCI may refuse refund requests where we reasonably believe the customer is abusing the refund process, acting dishonestly, raising repeated unfounded claims, using the service to obtain free guidance, or attempting to recover fees after receiving substantial work.</p>
          </SectionCard>

          <SectionCard id="changes" title="20. Changes to This Refund Policy">
            <p>FlyOCI may update this Refund Policy from time to time.</p>
            <p>The latest version will be available on our website.</p>
            <p>The version in force at the time of purchase will normally apply to your order unless a legal change requires otherwise.</p>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
