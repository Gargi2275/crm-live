import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogFaqAccordion } from "@/components/blog/BlogFaqAccordion";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { getPublicBlogPost } from "@/lib/api";
import { formatBlogDate, prepareBlogContent } from "@/lib/blog";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

type PageProps = {
  params: { slug: string };
};

async function loadPost(slug: string) {
  try {
    return await getPublicBlogPost(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await loadPost(params.slug);
  if (!data?.post) {
    return { title: `Article not found | ${SITE_NAME}` };
  }

  const post = data.post;
  const title = post.meta_title?.trim() || post.title;
  const description =
    post.meta_description?.trim() ||
    post.excerpt?.trim() ||
    `Read ${post.title} on FlyOCI — guides for OCI and NRI families.`;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images: post.featured_image_url
        ? [{ url: post.featured_image_url, alt: post.title }]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const data = await loadPost(params.slug);
  if (!data?.post) notFound();

  const { post, related } = data;
  const { html, headings } = prepareBlogContent(post.content || "");
  const dateLabel = formatBlogDate(post.updated_at || post.published_at || post.created_at);
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : null;
  const faqs = Array.isArray(post.faqs) ? post.faqs : [];
  const showCta = Boolean(post.cta_title?.trim());
  const authorName = post.author_name?.trim() || "FlyOCI";
  const authorTitle = post.author_title?.trim() || "";
  const excerpt = post.excerpt?.trim() || "";

  return (
    <div className="font-body">
      <article className="min-h-screen bg-[linear-gradient(180deg,#eef5ff_0%,#f7faff_18%,#ffffff_55%)]">
        <div className="mx-auto w-full max-w-[1600px] px-3 pb-16 pt-24 sm:px-5 sm:pt-28 lg:px-6 xl:px-8">
          <nav className="mb-5 text-[13px] text-[#6b8099]" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/blog" className="font-medium text-[#155fc4] hover:underline">
                  Blog
                </Link>
              </li>
              <li aria-hidden className="text-[#c5d4e8]">
                /
              </li>
              <li className="max-w-[min(100%,36rem)] truncate text-[#507090]">{post.title}</li>
            </ol>
          </nav>

          {/* Title left + image right */}
          <header className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-8 xl:gap-10">
            <div className="flex flex-col justify-center rounded-[1.35rem] border border-[#d7e4f5] bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,40,80,0.06)] backdrop-blur-sm sm:p-7 lg:p-8">
              <h1 className="font-heading text-[clamp(1.75rem,3.2vw,2.65rem)] font-black leading-[1.12] tracking-[-0.03em] text-[#0b2a6b]">
                {post.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3.5">
                {post.author_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author_image_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-[#e8f0ff]"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(145deg,#155fc4,#0b2a6b)] font-heading text-base font-bold text-white">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug text-[#334e68]">
                    <span className="text-[#6b8099]">Posted by</span>{" "}
                    <span className="font-bold text-[#0b2a6b]">{authorName}</span>
                  </p>
                  {authorTitle ? (
                    <p className="mt-0.5 text-[13px] font-medium text-[#155fc4]">{authorTitle}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[#6b8099]">
                {dateLabel && (
                  <time dateTime={post.updated_at || post.published_at || undefined}>
                    Updated on: {dateLabel}
                  </time>
                )}
                {dateLabel ? <span aria-hidden className="text-[#c5d4e8]">|</span> : null}
                <span className="rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[12px] font-semibold text-[#155fc4]">
                  Editorial
                </span>
                {readTime ? <span aria-hidden className="text-[#c5d4e8]">|</span> : null}
                {readTime && <span>{readTime}</span>}
              </div>

              {excerpt ? (
                <p className="mt-5 border-t border-[#e8f0fa] pt-5 text-[15px] leading-relaxed text-[#507090] sm:text-base">
                  {excerpt}
                </p>
              ) : null}
            </div>

            <div className="relative min-h-[240px] overflow-hidden rounded-[1.35rem] border border-[#c9dbf3] shadow-[0_22px_55px_rgba(21,95,196,0.18)] lg:min-h-full">
              {post.featured_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.featured_image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(145deg,#0b2a6b_0%,#155fc4_52%,#4d9bff_100%)]">
                  <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_18%_22%,#fff_0,transparent_42%),radial-gradient(circle_at_82%_70%,#9fd0ff_0,transparent_38%)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b2a6b]/75 via-[#0b2a6b]/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                  FlyOCI Guide
                </p>
                <p className="mt-1 line-clamp-2 font-heading text-lg font-bold leading-snug text-white sm:text-xl">
                  {post.title}
                </p>
              </div>
            </div>
          </header>

          {/* Article + TOC */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start xl:mt-10 xl:gap-8">
            <div className="min-w-0">
              <div className="mb-6 lg:hidden">
                <BlogTableOfContents headings={headings} />
              </div>

              <div
                className="blog-prose rounded-[1.25rem] border border-[#dce8f6] bg-white px-4 py-6 shadow-[0_10px_32px_rgba(15,40,80,0.04)] sm:px-7 sm:py-8 lg:px-9 lg:py-9"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {showCta && (
                <aside className="mt-7 overflow-hidden rounded-[1.25rem] bg-[linear-gradient(125deg,#155fc4_0%,#0b2a6b_100%)] p-6 text-white shadow-[0_18px_44px_rgba(21,95,196,0.28)] sm:p-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                    Need help?
                  </p>
                  <h2 className="mt-2 font-heading text-xl font-bold sm:text-2xl">{post.cta_title}</h2>
                  {post.cta_body && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-[15px]">
                      {post.cta_body}
                    </p>
                  )}
                  {post.cta_button_text && post.cta_button_url && (
                    <Link
                      href={post.cta_button_url}
                      className="mt-5 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0b2a6b] transition hover:bg-[#eef4ff]"
                    >
                      {post.cta_button_text}
                    </Link>
                  )}
                </aside>
              )}

              {faqs.length > 0 && (
                <div className="mt-7 rounded-[1.25rem] border border-[#dce8f6] bg-white px-4 shadow-[0_10px_32px_rgba(15,40,80,0.04)] sm:px-7">
                  <BlogFaqAccordion faqs={faqs} />
                </div>
              )}

              <aside className="mt-7 flex gap-4 rounded-[1.25rem] border border-[#d7e4f5] bg-white p-5 shadow-[0_10px_32px_rgba(15,40,80,0.04)] sm:gap-5 sm:p-6">
                {post.author_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author_image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[#e8f0ff]"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#155fc4,#0b2a6b)] font-heading text-xl font-bold text-white">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b8099]">
                    Posted by
                  </p>
                  <p className="mt-1 font-heading text-lg font-bold text-[#0b2a6b]">{authorName}</p>
                  {authorTitle ? (
                    <p className="text-sm font-semibold text-[#155fc4]">{authorTitle}</p>
                  ) : null}
                  {post.author_bio ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#507090]">{post.author_bio}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-[#507090]">
                      Practical guides from the FlyOCI team for OCI, passport, and NRI documentation.
                    </p>
                  )}
                </div>
              </aside>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <BlogTableOfContents headings={headings} />
                <div className="rounded-2xl border border-[#b9d2f5] bg-[linear-gradient(160deg,#f3f8ff_0%,#e8f1ff_100%)] p-5">
                  <p className="font-heading text-base font-bold text-[#0b2a6b]">Need help with documents?</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#507090]">
                    Clear guidance on your OCI or passport case.
                  </p>
                  <Link
                    href="/services"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#155fc4] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b2a6b]"
                  >
                    Browse services
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-12 border-t border-[#e2ecf8] pt-10 xl:mt-14">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#155fc4]">
                    Keep reading
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-[#0b2a6b]">
                    Related articles
                  </h2>
                </div>
                <Link href="/blog" className="text-sm font-semibold text-[#155fc4] hover:underline">
                  View all posts →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                {related.slice(0, 3).map((item) => (
                  <BlogPostCard key={item.id} post={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
