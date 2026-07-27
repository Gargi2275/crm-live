import { FadeInUp } from "@/components/FadeInUp";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { home } from "@/components/home/homeTheme";

type TestimonialItem = {
  title: string;
  quote: string;
  author: string;
  service: string;
  detail: string;
  rating: number;
};

export function TestimonialsSection({
  testimonials,
  fallbackTestimonials,
}: {
  testimonials: TestimonialItem[];
  fallbackTestimonials: TestimonialItem[];
}) {
  return (
    <section className={home.sectionWhite}>
      <div className={home.container}>
        <FadeInUp className="mb-10 text-center">
          <h2 className={`${home.h2} mb-3`}>Our customers say</h2>
          <p className={`${home.lead} mx-auto`}>
            Real feedback from UK and US families who used FlyOCI for OCI, e-Visa, and document pre-check support.
          </p>
        </FadeInUp>

        <FadeInUp delay={0.2} className="overflow-visible">
          <TestimonialsCarousel initialItems={testimonials} staticItems={fallbackTestimonials} />
        </FadeInUp>
      </div>
    </section>
  );
}
