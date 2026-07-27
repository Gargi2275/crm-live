import Link from "next/link";
import { BlogListingClient } from "@/components/blog/BlogListingClient";
import { getPublicBlogPosts } from "@/lib/api";
import { buildPageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";

export const metadata = buildPageMetadata(PAGE_SEO.blog);
export const dynamic = "force-dynamic";

async function loadBlog() {
  try {
    return await getPublicBlogPosts();
  } catch {
    return { posts: [], categories: [] };
  }
}

export default async function BlogPage() {
  const { posts } = await loadBlog();

  return (
    <div className="font-body">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_72%)] px-4 pb-10 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#dcecff] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe1fb] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#155fc4] shadow-sm">
            Insights
          </div>
          <h1 className="font-heading text-[clamp(1.85rem,4.2vw,3rem)] font-black leading-tight tracking-[-0.02em] text-[#0b2a6b]">
            Guides for OCI &amp; NRI families
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-[#506080] sm:text-lg">
            Practical articles on documents, timelines, and common pitfalls — written for UK and US applicants.
          </p>
        </div>
      </section>

      <section className="bg-white pb-20 pt-4">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-5 lg:px-6 xl:px-8">
          <BlogListingClient posts={posts} />

          <p className="mt-12 text-center text-sm text-[#6b8099]">
            Need hands-on help?{" "}
            <Link href="/document-audit" className="font-semibold text-[#155fc4] hover:underline">
              Start a document audit
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="font-semibold text-[#155fc4] hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
