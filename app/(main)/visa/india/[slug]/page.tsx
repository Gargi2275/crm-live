import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { BlogFaqAccordion } from "@/components/blog/BlogFaqAccordion";
import { OriginCountriesSection } from "@/components/home/OriginCountriesSection";
import { getPublicOriginCountry } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

async function resolveParams(params: PageProps["params"]) {
  return typeof (params as Promise<{ slug: string }>).then === "function"
    ? await (params as Promise<{ slug: string }>)
    : (params as { slug: string });
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await resolveParams(params);
  try {
    const { country } = await getPublicOriginCountry(slug);
    const title = country.page_title || `Indian Visa for ${country.name}`;
    const description =
      country.page_subtitle ||
      `Apply for an Indian e-Visa from ${country.name} with FlyOCI expert support.`;
    return buildPageMetadata({
      title,
      description,
      path: `/visa/india/${country.slug || slug}`,
    });
  } catch {
    return buildPageMetadata({
      title: "Indian e-Visa by nationality",
      description: "Apply for an Indian e-Visa with FlyOCI.",
      path: `/visa/india/${slug}`,
    });
  }
}

const whyPoints = [
  {
    title: "High approval focus",
    body: "We review forms and documents carefully so applications are submitted cleanly the first time.",
    icon: ShieldCheck,
  },
  {
    title: "Clear fixed guidance",
    body: "Know what you need, what it costs, and what happens next — without hidden steps.",
    icon: Sparkles,
  },
  {
    title: "Real updates",
    body: "Stay informed by email and WhatsApp as your case moves through each stage.",
    icon: Clock3,
  },
  {
    title: "Personal support",
    body: "UK & US-focused specialists help families navigate OCI, e-Visa, and document checks.",
    icon: CheckCircle2,
  },
];

function formatFee(fee: string | number) {
  const value = Number(fee);
  if (!Number.isFinite(value)) return String(fee);
  return `£${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

export default async function IndianVisaCountryPage({ params }: PageProps) {
  const { slug } = await resolveParams(params);

  let detail;
  try {
    detail = await getPublicOriginCountry(slug);
  } catch {
    notFound();
  }

  const { country, other_countries: otherCountries } = detail;
  const visaOptions = (country.visa_options || []).filter((opt) => opt.is_active !== false);
  const ctaHref = country.cta_href || "/indian-e-visa";
  const pageTitle = country.page_title || `Indian Visa for ${country.name}`;
  const pageSubtitle =
    country.page_subtitle ||
    `Our visa experts help ${country.name} applicants complete Indian e-Visa applications with clear checks and updates.`;

  const faqs = (country.faqs || []).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));

  return (
    <div className="font-body bg-white">
      <section className="relative overflow-hidden bg-[#f7fbff] pt-28 pb-14 sm:pt-32 sm:pb-16 lg:pt-36 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(51,161,253,0.12),transparent_48%)]" />
        <div className="relative mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f7ee8]">
              Indian e-Visa · {country.badge}
            </p>
            <h1 className="mt-3 font-heading text-[clamp(1.85rem,4vw,3rem)] font-black leading-tight tracking-[-0.03em] text-[#0d1f2d]">
              {pageTitle}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#4c6278] sm:text-base">
              {pageSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={visaOptions[0]?.cta_href || ctaHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#33A1FD] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(51,161,253,0.28)] transition hover:bg-[#0f7ee8]"
              >
                Start application
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#plans"
                className="inline-flex items-center justify-center rounded-xl border border-[#c8ddf5] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#0d1f2d] transition hover:border-[#33A1FD]/50"
              >
                View e-Visa options
              </Link>
            </div>
            <p className="mt-5 text-[12px] text-[#7f92a6]">
              Independent service · Not affiliated with government or VFS
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#d6e7ff] bg-white shadow-[0_18px_48px_rgba(18,84,150,0.10)]">
            {country.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={country.image_url}
                alt={country.name}
                className="h-56 w-full object-cover sm:h-72"
              />
            ) : (
              <div className="flex h-56 items-center justify-center bg-[#e8f3ff] text-3xl font-black text-[#1c69dd] sm:h-72">
                {country.country_code}
              </div>
            )}
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f7ee8]">
                Applying from
              </p>
              <p className="mt-1 font-heading text-xl font-bold text-[#0d1f2d]">{country.name}</p>
              <p className="mt-1 text-sm text-[#5a7085]">{country.service_label}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2.15rem)] font-bold text-[#0b2a6b]">
              Indian e-Visa options for your journey
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#627d98]">
              Select the Indian e-Visa type that best fits your travel plans. Prices shown are for{" "}
              {country.name} applicants.
            </p>
          </div>

          {visaOptions.length ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visaOptions.map((plan) => (
                <article
                  key={plan.id}
                  className="flex h-full flex-col rounded-2xl border border-[#d6e7ff] bg-[#f8fbff] p-5 shadow-[0_8px_28px_rgba(22,68,130,0.06)]"
                >
                  <h3 className="font-heading text-lg font-bold text-[#0b2a6b]">{plan.label}</h3>
                  <p className="mt-5 font-heading text-3xl font-black text-[#0d1f2d]">
                    {formatFee(plan.fee)}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[#486581]">
                    {plan.entries ? (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#33A1FD]" />
                        <span>Entries: {plan.entries}</span>
                      </li>
                    ) : null}
                    {plan.max_stay ? (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#33A1FD]" />
                        <span>Maximum stay: {plan.max_stay}</span>
                      </li>
                    ) : null}
                    {plan.validity ? (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#33A1FD]" />
                        <span>Validity: {plan.validity}</span>
                      </li>
                    ) : null}
                    {plan.travel_purpose ? (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#33A1FD]" />
                        <span>Travel purpose: {plan.travel_purpose}</span>
                      </li>
                    ) : null}
                  </ul>
                  <div className="mt-auto pt-6">
                    <Link
                      href={plan.cta_href || ctaHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d1f2d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#33A1FD]"
                    >
                      Start application
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-[#d6e7ff] bg-[#f8fbff] p-6">
              <p className="text-sm text-[#486581]">
                e-Visa plans for this nationality are being updated. You can still start your application now.
              </p>
              <Link
                href={ctaHref}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1c69dd]"
              >
                Continue to Indian e-Visa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f7fbff] py-14 sm:py-16">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-[clamp(1.5rem,3vw,2.15rem)] font-bold text-[#0b2a6b]">
            Why choose FlyOCI for your Indian e-Visa
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#627d98]">
            Built for UK and US families who want a predictable path — not guesswork.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {whyPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border border-[#d6e7ff] bg-white p-5 shadow-[0_8px_24px_rgba(22,68,130,0.05)]"
              >
                <point.icon className="h-5 w-5 text-[#1c69dd]" />
                <h3 className="mt-3 font-heading text-base font-bold text-[#0d1f2d]">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a7085]">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <OriginCountriesSection
        title="Indian visa application for other nationalities"
        subtitle="Select your country to open the matching Indian e-Visa landing page."
        countries={otherCountries}
      />

      <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[800px]">
          {faqs.length ? (
            <BlogFaqAccordion faqs={faqs} />
          ) : (
            <div className="rounded-2xl border border-[#d6e7ff] bg-[#f8fbff] p-6 text-sm text-[#486581]">
              FAQs for this nationality will appear here once added in admin.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
