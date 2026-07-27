"use client";

import { BlogPostCard } from "@/components/blog/BlogPostCard";
import type { PublicBlogPost } from "@/lib/api";

type BlogListingClientProps = {
  posts: PublicBlogPost[];
  categories?: unknown;
};

export function BlogListingClient({ posts }: BlogListingClientProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(21,95,196,0.12)] bg-white px-8 py-16 text-center">
        <p className="font-heading text-xl font-bold text-[#0b2a6b]">No articles yet</p>
        <p className="mt-2 font-body text-sm text-[#507090]">
          Check back soon for guides on OCI, e-Visa, and NRI documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {posts.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
