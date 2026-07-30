"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

interface Testimonial {
  title?: string;
  quote: string;
  author: string;
  detail?: string;
  service?: string;
  rating?: number;
}

interface CarouselProps {
  items: Testimonial[];
}

export function Carousel({ items }: CarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const resolveRating = (rating?: number) => {
    const normalized = Number.isFinite(rating ?? NaN) ? Number(rating) : 5;
    return Math.max(1, Math.min(5, Math.round(normalized)));
  };

  if (!items.length) return null;

  return (
    <div className="relative w-full">
      <div className="mb-4 flex items-center justify-end">
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm transition-colors hover:bg-[#eef5ff]"
            aria-label="Previous review"
          >
            <ChevronLeft className="mx-auto h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm transition-colors hover:bg-[#eef5ff]"
            aria-label="Next review"
          >
            <ChevronRight className="mx-auto h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden py-2">
        <Swiper
          modules={[Autoplay, Navigation]}
          loop={items.length > 3}
          speed={650}
          spaceBetween={16}
          slidesPerView={1}
          slidesPerGroup={1}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          breakpoints={{
            640: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 16 },
            1024: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 18 },
          }}
        >
          {items.map((item, index) => (
            <SwiperSlide key={`${item.author}-${index}`} className="h-auto">
              <motion.article
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.1 }}
                className="flex h-full flex-col rounded-[14px] border border-[#d9e6f7] bg-white p-4 shadow-[0_8px_18px_rgba(27,64,121,0.08)]"
              >
                <h4 className="mb-2 line-clamp-1 font-heading text-[16px] leading-[1.25] text-[#102c5a] md:text-[17px]">
                  {item.title || "Smooth and Easy OCI Service"}
                </h4>
                <p className="min-h-[92px] line-clamp-4 font-body text-[13px] leading-[1.45] text-[#4d6688] md:text-[14px]">
                  {item.quote}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.service ? (
                    <span className="inline-flex items-center rounded-full border border-[#d3e4fb] bg-[#f5f9ff] px-2.5 py-1 text-[11px] font-semibold text-[#285185]">
                      {item.service}
                    </span>
                  ) : null}
                  {item.detail ? (
                    <span className="inline-flex items-center rounded-full border border-[#dce8f8] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#4d6688]">
                      {item.detail}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1d4f9a] text-xs font-semibold text-white shadow-[0_6px_14px_rgba(29,79,154,0.35)]">
                      {initials(item.author || "Customer")}
                    </span>
                    <span className="font-body text-[13px] font-semibold text-[#1d3760] md:text-[14px]">
                      {item.author || "Verified Customer"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < resolveRating(item.rating) ? "fill-[#f2b01e] text-[#f2b01e]" : "text-[#d8dee8]"}`}
                      />
                    ))}
                    <span className="ml-1 text-sm font-semibold text-[#1d3760]">{resolveRating(item.rating)}.0</span>
                  </div>
                </div>
              </motion.article>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => swiperRef.current?.slidePrev()}
          className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm"
          aria-label="Previous review"
        >
          <ChevronLeft className="mx-auto h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => swiperRef.current?.slideNext()}
          className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm"
          aria-label="Next review"
        >
          <ChevronRight className="mx-auto h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
