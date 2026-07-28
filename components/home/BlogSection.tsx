import Link from "next/link";
import { FadeInUp } from "@/components/FadeInUp";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { ParallaxBlob, StaggerItem, StaggerReveal } from "@/components/home/HomeScrollMotion";
import type { PublicBlogPost } from "@/lib/api";
import { home } from "@/components/home/homeTheme";

type BlogSectionProps = {
  posts: PublicBlogPost[];
};

export function BlogSection({ posts }: BlogSectionProps) {
  if (!posts.length) return null;

  return (
    <section className={home.sectionSoft}>
      <ParallaxBlob
        speed={46}
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(51,161,253,0.08)_0%,transparent_70%)]"
      />
      <ParallaxBlob
        speed={30}
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(15,126,232,0.06)_0%,transparent_70%)]"
      />

      <div className={home.container}>
        <FadeInUp className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={`${home.chip} mb-4`}>
              <span className="h-2 w-2 rounded-full bg-primary" />
              Insights
            </div>
            <h2 className={home.h2}>Guides for OCI &amp; NRI families</h2>
            <p className={home.lead}>
              Practical articles on documents, timelines, and common pitfalls — written for UK and US applicants.
            </p>
          </div>

          <Link href="/blog" className={home.btnOutline}>
            View all articles
            <span aria-hidden>→</span>
          </Link>
        </FadeInUp>

        <StaggerReveal className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <StaggerItem key={post.id}>
              <BlogPostCard post={post} />
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
