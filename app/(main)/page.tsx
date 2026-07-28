import HeroSection from "@/components/HeroSection";
import WhatWeDo from "@/components/WhatWeDo";
import { CategoryServicesSection } from "@/components/home/CategoryServicesSection";
import { OriginCountriesSection } from "@/components/home/OriginCountriesSection";
import { TrustFeaturesSection } from "@/components/home/TrustFeaturesSection";
import { BlogSection } from "@/components/home/BlogSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { PricingSection } from "@/components/home/PricingSection";
import { HomeSectionReveal } from "@/components/home/HomeScrollMotion";
import {
  getPublicBlogPosts,
  getPublicHomepageModules,
  getPublicOriginCountries,
  getPublicTestimonials,
  type PublicBlogPost,
  type PublicOriginCountriesPayload,
} from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import type { ReactNode } from "react";

export const metadata = buildPageMetadata(PAGE_SEO.home);

const DEFAULT_MODULE_KEYS = [
  "hero",
  "what_we_do",
  "category_services",
  "origin_countries",
  "how_it_works",
  "pricing",
  "trust_features",
  "testimonials",
  "blog",
  "final_cta",
];

const fallbackTestimonials = [
  {
    title: "OCI Renewal Was Smooth and Stress-Free",
    quote:
      "FlyOCI made my parents' OCI renewal very easy. All documents were checked in advance and there were no surprises at VFS.",
    author: "Rajesh K., UK",
    service: "OCI Renewal",
    detail: "Documents checked ahead",
    rating: 5,
  },
  {
    title: "They Helped Me Pick the Right Option",
    quote: "I was confused about e-Visa vs OCI. The team explained everything clearly and suggested the right option.",
    author: "Anita P., US",
    service: "Indian e-Visa",
    detail: "Service Guidance",
    rating: 5,
  },
  {
    title: "Strong Support for First-Time Applicants",
    quote:
      "As a first-time applicant, I had many doubts. FlyOCI made everything easy to understand and support on email and WhatsApp was quick.",
    author: "Anita Patel",
    service: "New OCI Card",
    detail: "WhatsApp + Email Updates",
    rating: 5,
  },
  {
    title: "Caught Missing Documents Early",
    quote:
      "The document check highlighted a name mismatch and missing supporting papers before submission. That saved me a rejection and a lot of delay.",
    author: "Rishabh S., London",
    service: "New OCI Card",
    detail: "Pre-submission document check",
    rating: 5,
  },
  {
    title: "Clear Pricing and No Hidden Surprises",
    quote:
      "Everything was explained clearly: service fee, government fee and timeline. The process felt transparent and professionally managed.",
    author: "Parth S., Manchester",
    service: "OCI Update",
    detail: "Fixed Transparent Fees",
    rating: 5,
  },
];

async function loadTestimonials() {
  try {
    const testimonials = await getPublicTestimonials();
    if (!testimonials.length) {
      return [];
    }

    return testimonials.map((testimonial) => ({
      title: testimonial.service_type ? `${testimonial.service_type} review` : "Customer review",
      quote: testimonial.testimonial_text,
      author: testimonial.author_name?.trim() || "Verified Customer",
      service: testimonial.service_type || "FlyOCI",
      detail: `${testimonial.rating}/5 rating`,
      rating: testimonial.rating,
    }));
  } catch {
    return [];
  }
}

async function loadHomepageBlogPosts() {
  try {
    const { posts } = await getPublicBlogPosts({ homepage: true, limit: 3 });
    return posts;
  } catch {
    return [];
  }
}

async function loadOriginCountries() {
  try {
    return await getPublicOriginCountries();
  } catch {
    return {
      title: "Apply for an Indian Visa from These Countries",
      subtitle:
        "Apply for Indian visas from the USA, UK, Canada, Australia, and other countries with FlyOCI.",
      countries: [],
    };
  }
}

async function loadHomepageModuleKeys() {
  try {
    const modules = await getPublicHomepageModules();
    const keys = modules
      .map((m) => m.key)
      .filter((key): key is string => Boolean(key) && key !== "document_audit");
    return keys.length ? keys : DEFAULT_MODULE_KEYS;
  } catch {
    return DEFAULT_MODULE_KEYS;
  }
}

function wrapSection(key: string, node: ReactNode): ReactNode {
  if (key === "hero" || !node) return node;
  return <HomeSectionReveal key={key}>{node}</HomeSectionReveal>;
}

function renderHomepageModule(
  key: string,
  ctx: {
    testimonials: Awaited<ReturnType<typeof loadTestimonials>>;
    blogPosts: PublicBlogPost[];
    originCountries: PublicOriginCountriesPayload;
  },
): ReactNode {
  switch (key) {
    case "hero":
      return <HeroSection key={key} />;
    case "what_we_do":
      return wrapSection(key, <WhatWeDo />);
    case "category_services":
      return wrapSection(key, <CategoryServicesSection />);
    case "origin_countries":
      return wrapSection(
        key,
        <OriginCountriesSection
          title={ctx.originCountries.title}
          subtitle={ctx.originCountries.subtitle}
          countries={ctx.originCountries.countries}
        />,
      );
    case "how_it_works":
      return wrapSection(key, <HowItWorksSection />);
    case "pricing":
      return wrapSection(key, <PricingSection />);
    case "trust_features":
      return wrapSection(key, <TrustFeaturesSection />);
    case "testimonials":
      return wrapSection(
        key,
        <TestimonialsSection
          testimonials={ctx.testimonials}
          fallbackTestimonials={fallbackTestimonials}
        />,
      );
    case "blog":
      return wrapSection(key, <BlogSection posts={ctx.blogPosts} />);
    case "final_cta":
      return wrapSection(key, <FinalCtaSection />);
    default:
      return null;
  }
}

export default async function Home() {
  const [testimonials, blogPosts, originCountries, moduleKeys] = await Promise.all([
    loadTestimonials(),
    loadHomepageBlogPosts(),
    loadOriginCountries(),
    loadHomepageModuleKeys(),
  ]);

  return (
    <div className="font-body">
      {moduleKeys.map((key) =>
        renderHomepageModule(key, { testimonials, blogPosts, originCountries }),
      )}
    </div>
  );
}
