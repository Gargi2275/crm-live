"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
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


  const initials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const resolveRating = (rating?: number) => {
    const normalized = Number.isFinite(rating ?? NaN) ? Number(rating) : 5;
    return Math.max(1, Math.min(5, Math.round(normalized)));
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-end mb-4">
        <div className="hidden md:flex items-center gap-2 ml-4 shrink-0">
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm hover:bg-[#eef5ff] transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5 mx-auto" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm hover:bg-[#eef5ff] transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5 mx-auto" />
          </button>
        </div>
      </div>

      <Swiper
        modules={[Autoplay]}
        loop={items.length > 3}
        speed={200}
        spaceBetween={12}
        slidesPerView={1}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        autoplay={{
          delay: 5500,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        breakpoints={{
          768: { slidesPerView: 2, spaceBetween: 12 },
          1024: { slidesPerView: 3, spaceBetween: 12 },
        }}
      >
          {items.map((item, index) => (
            <SwiperSlide key={`${item.author}-${index}`} className="h-auto">
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(27,64,121,0.12)" }}
              transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
              className="h-full rounded-[14px] border border-[#d9e6f7] bg-white p-4 mb-2 md:p-4 shadow-[0_8px_18px_rgba(27,64,121,0.08)]"
            >
              <h4 className="font-heading text-[#102c5a] text-[16px] md:text-[17px] leading-[1.25] mb-2 line-clamp-1">
                {item.title || "Smooth and Easy OCI Service"}
              </h4>
              <p className="font-body text-[#4d6688] text-[13px] md:text-[14px] leading-[1.45] min-h-[92px] line-clamp-4">
                {item.quote}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.service && (
                  <span className="inline-flex items-center rounded-full border border-[#d3e4fb] bg-[#f5f9ff] px-2.5 py-1 text-[11px] font-semibold text-[#285185]">
                    {item.service}
                  </span>
                )}
                {item.detail && (
                  <span className="inline-flex items-center rounded-full border border-[#dce8f8] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-medium text-[#4d6688]">
                    {item.detail}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-[#1d4f9a] text-white font-semibold text-xs inline-flex items-center justify-center shadow-[0_6px_14px_rgba(29,79,154,0.35)]">
                    {initials(item.author || "Customer")}
                  </span>
                  <span className="font-body text-[#1d3760] font-semibold text-[13px] md:text-[14px]">{item.author || "Verified Customer"}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < resolveRating(item.rating) ? "fill-[#f2b01e] text-[#f2b01e]" : "text-[#d8dee8]"}`}
                    />
                  ))}
                  <span className="ml-1 text-[#1d3760] text-sm font-semibold">{resolveRating(item.rating)}.0</span>
                </div>
              </div>
            </motion.article>
            </SwiperSlide>
          ))}
      </Swiper>

      <div className="md:hidden flex items-center justify-center gap-3 mt-5">
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-5 w-5 mx-auto" />
        </button>
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="h-10 w-10 rounded-full border border-[#d7e4f5] bg-white text-[#1c3b67] shadow-sm"
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </div>
  );
}
