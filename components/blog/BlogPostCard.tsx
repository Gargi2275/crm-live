import Link from "next/link";
import type { PublicBlogPost } from "@/lib/api";
import { formatBlogDate } from "@/lib/blog";

type BlogPostCardProps = {
  post: PublicBlogPost;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
  const dateLabel = formatBlogDate(post.published_at || post.updated_at || post.created_at);
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : null;
  const authorName = post.author_name?.trim();

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d7e4f5] bg-white shadow-[0_8px_24px_rgba(15,40,80,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(30,74,135,0.12)]">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-[#e8f0ff]">
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[linear-gradient(135deg,#0b2a6b_0%,#155fc4_55%,#4d95ff_100%)] p-4">
            <span className="font-heading text-lg font-bold leading-snug text-white/90 line-clamp-2">
              {post.title}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {authorName && (
          <p className="mb-2 text-[12px] font-semibold text-[#6b8099]">
            Posted by <span className="font-bold text-[#155fc4]">{authorName}</span>
          </p>
        )}

        <h3 className="font-heading text-lg font-bold leading-snug text-[#0b2a6b] sm:text-[1.15rem]">
          <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-[#155fc4]">
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-3 flex-1 font-body text-sm leading-relaxed text-[#507090]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#6b8099]">
          {readTime && <span>{readTime}</span>}
          {readTime && dateLabel && <span aria-hidden className="text-[#c5d4e8]">·</span>}
          {dateLabel && (
            <time dateTime={post.published_at || post.updated_at || undefined}>{dateLabel}</time>
          )}
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#155fc4] transition-colors hover:text-[#0b2a6b]"
        >
          Read more
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
