"use client";

import { useEffect, useMemo, useState } from "react";
import { Carousel } from "@/components/ui/Carousel";
import { getPublicTestimonials } from "@/lib/api";

type CarouselItem = {
  title?: string;
  quote: string;
  author: string;
  detail?: string;
  service?: string;
  rating?: number;
};

type TestimonialsCarouselProps = {
  initialItems: CarouselItem[];
  staticItems: CarouselItem[];
};

const getItemKey = (item: CarouselItem) => `${item.author}__${item.quote}`;

const mergeItems = (dynamicItems: CarouselItem[], staticItems: CarouselItem[]) => {
  const merged = [...dynamicItems];
  const seen = new Set(dynamicItems.map(getItemKey));

  for (const item of staticItems) {
    const key = getItemKey(item);
    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
  }

  return merged;
};

const mapTestimonialsToCarouselItems = (testimonials: Array<{
  service_type?: string;
  testimonial_text: string;
  author_name?: string;
  rating: number;
}>): CarouselItem[] =>
  testimonials.map((testimonial) => ({
    title: testimonial.service_type ? `${testimonial.service_type} review` : "Customer review",
    quote: testimonial.testimonial_text,
    author: testimonial.author_name?.trim() || "Verified Customer",
    service: testimonial.service_type || "FlyOCI",
    detail: `${testimonial.rating}/5 rating`,
    rating: testimonial.rating,
  }));

export function TestimonialsCarousel({ initialItems, staticItems }: TestimonialsCarouselProps) {
  const [items, setItems] = useState<CarouselItem[]>(() => mergeItems(initialItems, staticItems));

  useEffect(() => {
    let cancelled = false;

    const refreshTestimonials = async () => {
      try {
        const testimonials = await getPublicTestimonials();
        if (cancelled || testimonials.length === 0) {
          return;
        }

        setItems(mergeItems(mapTestimonialsToCarouselItems(testimonials), staticItems));
      } catch {
        // Keep current items if refresh fails.
      }
    };

    void refreshTestimonials();

    return () => {
      cancelled = true;
    };
  }, [staticItems]);

  const safeItems = useMemo(() => {
    if (items.length > 0) {
      return items;
    }

    return mergeItems(initialItems, staticItems);
  }, [items, initialItems, staticItems]);

  return <Carousel items={safeItems} />;
}
