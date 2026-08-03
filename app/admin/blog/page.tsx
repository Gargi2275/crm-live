"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ImagePlus, Newspaper, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useAdminModuleAccess } from "@/hooks/useAdminModuleAccess";
import { useSetAdminPageChrome } from "@/components/console/AdminPageChromeContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPost,
  listAdminBlogPosts,
  updateAdminBlogPost,
  type AdminBlogFaq,
  type AdminBlogPost,
  type AdminBlogPostInput,
} from "@/lib/admin-auth";

const filterFieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

const inputClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-[15px] leading-5 text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877]";

const textareaClass = `${inputClass} min-h-[88px] resize-y`;

const iconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition-colors disabled:opacity-50";

type PostFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  author_name: string;
  author_title: string;
  author_bio: string;
  author_image_url: string;
  read_time_minutes: string;
  faqs: AdminBlogFaq[];
  cta_title: string;
  cta_body: string;
  cta_button_text: string;
  cta_button_url: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  show_on_homepage: boolean;
  display_order: string;
  published_at: string;
};

const emptyForm = (): PostFormState => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image_url: "",
  author_name: "",
  author_title: "",
  author_bio: "",
  author_image_url: "",
  read_time_minutes: "5",
  faqs: [],
  cta_title: "",
  cta_body: "",
  cta_button_text: "",
  cta_button_url: "",
  meta_title: "",
  meta_description: "",
  is_published: false,
  show_on_homepage: false,
  display_order: "0",
  published_at: "",
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toDatetimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formFromPost = (post: AdminBlogPost): PostFormState => ({
  title: post.title || "",
  slug: post.slug || "",
  excerpt: post.excerpt || "",
  content: post.content || "",
  featured_image_url: post.featured_image_url_raw || post.featured_image_url || "",
  author_name: post.author_name || "",
  author_title: post.author_title || "",
  author_bio: post.author_bio || "",
  author_image_url: post.author_image_url_raw || post.author_image_url || "",
  read_time_minutes: String(post.read_time_minutes ?? 5),
  faqs: Array.isArray(post.faqs) ? post.faqs.map((f) => ({ question: f.question || "", answer: f.answer || "" })) : [],
  cta_title: post.cta_title || "",
  cta_body: post.cta_body || "",
  cta_button_text: post.cta_button_text || "",
  cta_button_url: post.cta_button_url || "",
  meta_title: post.meta_title || "",
  meta_description: post.meta_description || "",
  is_published: Boolean(post.is_published),
  show_on_homepage: Boolean(post.show_on_homepage),
  display_order: String(post.display_order ?? 0),
  published_at: toDatetimeLocal(post.published_at),
});

function ImageUploadField({
  label,
  hint,
  previewUrl,
  fileName,
  onSelect,
  onClear,
  tall,
}: {
  label: string;
  hint?: string;
  previewUrl: string | null;
  fileName?: string | null;
  onSelect: (file: File | null) => void;
  onClear: () => void;
  tall?: boolean;
}) {
  return (
    <div className="block text-sm">
      <span className="text-xs font-semibold text-[#486581]">{label}</span>
      {hint ? <p className="mt-0.5 text-[12px] text-[#627D98]">{hint}</p> : null}
      <div
        className={`mt-1 overflow-hidden rounded-[10px] border border-dashed border-[#C9D5E0] bg-[#F8FAFC] ${
          tall ? "min-h-[180px]" : "min-h-[120px]"
        }`}
      >
        {previewUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className={`w-full object-cover ${tall ? "h-[180px]" : "h-[120px]"}`}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent px-3 py-2">
              <span className="truncate text-[12px] font-medium text-white">
                {fileName || "Current image"}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <label className="cursor-pointer rounded-[6px] bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#102A43] hover:bg-white">
                  Replace
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onSelect(e.target.files?.[0] || null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-[6px] bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#B42318] hover:bg-white"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label className="flex h-full min-h-[inherit] cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6 text-center hover:bg-[#F0F4F8]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#D9E1EA] text-[#009877]">
              <Upload className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-[#102A43]">Upload image</span>
            <span className="text-[12px] text-[#627D98]">PNG, JPG, or WebP</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onSelect(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function AdminBlogPage() {
  const { canAccess, accessReady } = useAdminModuleAccess("/admin/blog");

  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState<"all" | "true" | "false">("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBlogPost | null>(null);
  const [form, setForm] = useState<PostFormState>(emptyForm);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [authorImageFile, setAuthorImageFile] = useState<File | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);

  const featuredPreview = useMemo(() => {
    if (featuredImageFile) return URL.createObjectURL(featuredImageFile);
    return form.featured_image_url || null;
  }, [featuredImageFile, form.featured_image_url]);

  const authorPreview = useMemo(() => {
    if (authorImageFile) return URL.createObjectURL(authorImageFile);
    return form.author_image_url || null;
  }, [authorImageFile, form.author_image_url]);

  useEffect(() => {
    return () => {
      if (featuredImageFile && featuredPreview?.startsWith("blob:")) URL.revokeObjectURL(featuredPreview);
    };
  }, [featuredImageFile, featuredPreview]);

  useEffect(() => {
    return () => {
      if (authorImageFile && authorPreview?.startsWith("blob:")) URL.revokeObjectURL(authorPreview);
    };
  }, [authorImageFile, authorPreview]);

  const loadPosts = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      setPosts(
        await listAdminBlogPosts({
          search: search.trim() || undefined,
          published: publishedFilter,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }, [canAccess, search, publishedFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setPublishedFilter("all");
  }, []);

  const closeEditor = useCallback(() => {
    if (saving) return;
    setEditorOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFeaturedImageFile(null);
    setAuthorImageFile(null);
  }, [saving]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm());
    setFeaturedImageFile(null);
    setAuthorImageFile(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback(async (row: AdminBlogPost) => {
    setEditorOpen(true);
    setEditing(row);
    setFeaturedImageFile(null);
    setAuthorImageFile(null);
    setLoadingDetail(true);
    try {
      const detail = await getAdminBlogPost(row.id);
      setEditing(detail);
      setForm(formFromPost(detail));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load post.");
      setEditorOpen(false);
      setEditing(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const updateField = useCallback(<K extends keyof PostFormState>(key: K, value: PostFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFeaturedImage = useCallback(() => {
    setFeaturedImageFile(null);
    updateField("featured_image_url", "");
  }, [updateField]);

  const clearAuthorImage = useCallback(() => {
    setAuthorImageFile(null);
    updateField("author_image_url", "");
  }, [updateField]);

  const buildPayload = useCallback((): AdminBlogPostInput => {
    const faqs = form.faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question && f.answer);

    return {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      category_id: null,
      excerpt: form.excerpt,
      content: form.content,
      featured_image_url: featuredImageFile ? "" : form.featured_image_url.trim(),
      featured_image: featuredImageFile,
      author_name: form.author_name.trim(),
      author_title: form.author_title.trim(),
      author_bio: form.author_bio,
      author_image_url: authorImageFile ? "" : form.author_image_url.trim(),
      author_image: authorImageFile,
      read_time_minutes: Math.max(1, Number(form.read_time_minutes) || 5),
      faqs,
      cta_title: form.cta_title,
      cta_body: form.cta_body,
      cta_button_text: form.cta_button_text,
      cta_button_url: form.cta_button_url,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      is_published: form.is_published,
      show_on_homepage: form.show_on_homepage,
      display_order: Math.max(0, Number(form.display_order) || 0),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    };
  }, [form, featuredImageFile, authorImageFile]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Post body is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        const updated = await updateAdminBlogPost(editing.id, payload);
        if (updated) {
          setPosts((prev) => prev.map((row) => (row.id === editing.id ? { ...row, ...updated } : row)));
        }
        toast.success("Post updated.");
      } else {
        const created = await createAdminBlogPost(payload);
        if (created) {
          setPosts((prev) => [created, ...prev]);
        }
        toast.success("Post created.");
      }
      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setFeaturedImageFile(null);
      setAuthorImageFile(null);
      void loadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save post.");
    } finally {
      setSaving(false);
    }
  }, [form.title, form.content, editing, buildPayload, loadPosts]);

  const confirmDeletePost = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteAdminBlogPost(deleteTarget.id);
      setPosts((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Post deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.");
    } finally {
      setSaving(false);
    }
  }, [deleteTarget]);

  const activeFilterCount = (search.trim() ? 1 : 0) + (publishedFilter !== "all" ? 1 : 0);

  useSetAdminPageChrome(
    canAccess
      ? editorOpen
        ? {
            title: editing ? "Edit post" : "New post",
            subtitle: "Full post editor",
            icon: Newspaper,
            syncKey: `editor|${editing?.id || "new"}|${saving}|${loadingDetail}`,
            actions: (
              <>
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA] disabled:opacity-60"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loadingDetail}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Create post"}
                </button>
              </>
            ),
          }
        : {
            title: "Blog",
            subtitle: "Manage posts",
            icon: Newspaper,
            search: {
              value: search,
              onChange: setSearch,
              placeholder: "Search title, slug, summary…",
            },
            activeFilterCount,
            onClearFilters: clearFilters,
            meta: `${posts.length} post${posts.length === 1 ? "" : "s"}`,
            syncKey: `${search}|${publishedFilter}|${loading}|${posts.length}|${saving}`,
            actions: (
              <>
                <button
                  type="button"
                  onClick={() => void loadPosts()}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#007B61]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New post
                </button>
              </>
            ),
            filtersContent: (
              <label className="block text-sm">
                <span className="text-xs font-semibold text-[#486581]">Published</span>
                <select
                  value={publishedFilter}
                  onChange={(e) => setPublishedFilter(e.target.value as "all" | "true" | "false")}
                  className={filterFieldClass}
                >
                  <option value="all">All posts</option>
                  <option value="true">Published only</option>
                  <option value="false">Drafts only</option>
                </select>
              </label>
            ),
          }
      : null,
  );

  if (!accessReady) {
    return (
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <p className="text-sm text-[#627D98]">Checking access…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="rounded-[12px] border border-[#D9E1EA] bg-white p-6 font-body">
        <h1 className="text-xl font-heading font-semibold text-[#102A43]">Blog</h1>
        <p className="mt-2 text-sm text-[#627D98]">
          Access restricted. Ask an admin to grant the Blog module for your role.
        </p>
      </div>
    );
  }

  if (editorOpen) {
    return (
      <div className="-mx-1 w-[calc(100%+0.5rem)] space-y-3 font-body md:-mx-2 md:w-[calc(100%+1rem)] lg:-mx-2.5 lg:w-[calc(100%+1.25rem)]">
        <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
          {loadingDetail ? (
            <p className="px-4 py-16 text-center text-sm text-[#627D98]">Loading post…</p>
          ) : (
            <>
              <div className="space-y-5 px-4 py-4 lg:px-5 lg:py-5">
                <div className="grid gap-4 xl:grid-cols-12">
                  <div className="space-y-4 xl:col-span-8">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold text-[#486581]">Title</span>
                        <input
                          autoFocus
                          value={form.title}
                          onChange={(e) => {
                            const value = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              title: value,
                              slug: editing ? prev.slug : slugify(value),
                            }));
                          }}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold text-[#486581]">Slug</span>
                        <input
                          value={form.slug}
                          onChange={(e) => updateField("slug", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">Short summary</span>
                      <p className="mt-0.5 text-[12px] text-[#627D98]">
                        Brief preview shown on the blog list and homepage cards.
                      </p>
                      <textarea
                        value={form.excerpt}
                        onChange={(e) => updateField("excerpt", e.target.value)}
                        className={textareaClass}
                        rows={3}
                        placeholder="1–2 sentences describing what this post is about"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">Post body</span>
                      <p className="mt-0.5 text-[12px] text-[#627D98]">
                        Full article text readers see on the post page. You can paste plain text or simple HTML formatting.
                      </p>
                      <textarea
                        value={form.content}
                        onChange={(e) => updateField("content", e.target.value)}
                        className={`${textareaClass} min-h-[280px]`}
                        rows={14}
                        placeholder="Write the full blog post here…"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 xl:col-span-4">
                    <ImageUploadField
                      label="Image upload"
                      hint="Used as the post cover on listing and detail pages."
                      previewUrl={featuredPreview}
                      fileName={featuredImageFile?.name}
                      onSelect={setFeaturedImageFile}
                      onClear={clearFeaturedImage}
                      tall
                    />

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Read time (minutes)</span>
                        <input
                          type="number"
                          min={1}
                          value={form.read_time_minutes}
                          onChange={(e) => updateField("read_time_minutes", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Display order</span>
                        <input
                          type="number"
                          min={0}
                          value={form.display_order}
                          onChange={(e) => updateField("display_order", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2 xl:col-span-1">
                        <span className="text-xs font-semibold text-[#486581]">Published at</span>
                        <input
                          type="datetime-local"
                          value={form.published_at}
                          onChange={(e) => updateField("published_at", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="rounded-[10px] border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 space-y-2.5">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.is_published}
                          onChange={(e) => updateField("is_published", e.target.checked)}
                          className="h-4 w-4 rounded border-[#D9E1EA]"
                        />
                        <span className="text-sm font-semibold text-[#486581]">Published</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.show_on_homepage}
                          onChange={(e) => updateField("show_on_homepage", e.target.checked)}
                          className="h-4 w-4 rounded border-[#D9E1EA]"
                        />
                        <span className="text-sm font-semibold text-[#486581]">Show on homepage</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-12">
                  <div className="space-y-3 xl:col-span-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#486581]">Author</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Author name</span>
                        <input
                          value={form.author_name}
                          onChange={(e) => updateField("author_name", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Author title</span>
                        <input
                          value={form.author_title}
                          onChange={(e) => updateField("author_title", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm sm:col-span-2">
                        <span className="text-xs font-semibold text-[#486581]">Author bio</span>
                        <textarea
                          value={form.author_bio}
                          onChange={(e) => updateField("author_bio", e.target.value)}
                          className={textareaClass}
                          rows={3}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
                    <ImageUploadField
                      label="Author image"
                      previewUrl={authorPreview}
                      fileName={authorImageFile?.name}
                      onSelect={setAuthorImageFile}
                      onClear={clearAuthorImage}
                    />
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#E5EAF0] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#486581]">FAQs</h3>
                    <button
                      type="button"
                      onClick={() => updateField("faqs", [...form.faqs, { question: "", answer: "" }])}
                      className="inline-flex items-center gap-1 rounded-[8px] border border-[#D9E1EA] px-2.5 py-1.5 text-xs font-semibold text-[#102A43] hover:bg-[#F5F7FA]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add FAQ
                    </button>
                  </div>
                  {form.faqs.length === 0 ? (
                    <p className="mt-2 text-sm text-[#627D98]">No FAQs yet.</p>
                  ) : (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {form.faqs.map((faq, index) => (
                        <div key={index} className="rounded-[8px] border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#627D98]">FAQ {index + 1}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  "faqs",
                                  form.faqs.filter((_, i) => i !== index),
                                )
                              }
                              className="text-[11px] font-semibold text-[#B42318] hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <label className="block text-sm">
                            <span className="text-xs font-semibold text-[#486581]">Question</span>
                            <input
                              value={faq.question}
                              onChange={(e) => {
                                const next = [...form.faqs];
                                next[index] = { ...next[index], question: e.target.value };
                                updateField("faqs", next);
                              }}
                              className={inputClass}
                            />
                          </label>
                          <label className="mt-2 block text-sm">
                            <span className="text-xs font-semibold text-[#486581]">Answer</span>
                            <textarea
                              value={faq.answer}
                              onChange={(e) => {
                                const next = [...form.faqs];
                                next[index] = { ...next[index], answer: e.target.value };
                                updateField("faqs", next);
                              }}
                              className={textareaClass}
                              rows={2}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-[10px] border border-[#E5EAF0] p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#486581]">CTA</h3>
                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">CTA title</span>
                      <input
                        value={form.cta_title}
                        onChange={(e) => updateField("cta_title", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">CTA body</span>
                      <textarea
                        value={form.cta_body}
                        onChange={(e) => updateField("cta_body", e.target.value)}
                        className={textareaClass}
                        rows={2}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Button text</span>
                        <input
                          value={form.cta_button_text}
                          onChange={(e) => updateField("cta_button_text", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-[#486581]">Button URL</span>
                        <input
                          value={form.cta_button_url}
                          onChange={(e) => updateField("cta_button_url", e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[10px] border border-[#E5EAF0] p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#486581]">SEO</h3>
                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">Meta title</span>
                      <input
                        value={form.meta_title}
                        onChange={(e) => updateField("meta_title", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs font-semibold text-[#486581]">Meta description</span>
                      <textarea
                        value={form.meta_description}
                        onChange={(e) => updateField("meta_description", e.target.value)}
                        className={textareaClass}
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 lg:px-5">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm font-semibold text-[#486581] hover:bg-[#F5F7FA] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loadingDetail}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007B61] disabled:opacity-60"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : editing ? "Save changes" : "Create post"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-1 w-[calc(100%+0.5rem)] space-y-3 font-body md:-mx-2 md:w-[calc(100%+1rem)] lg:-mx-2.5 lg:w-[calc(100%+1.25rem)]">
      <div className="overflow-hidden rounded-[10px] border border-[#D9E1EA] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#F5F7FA] text-[#486581]">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Title</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Published</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Homepage</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Read time</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                    Loading…
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#627D98]">
                    No posts match these filters.
                  </td>
                </tr>
              ) : (
                posts.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FCFF]">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-[#102A43]">{row.title}</div>
                      <div className="text-xs text-[#627D98]">{row.slug}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          row.is_published ? "bg-[#009877]/12 text-[#006F57]" : "bg-[#F5F7FA] text-[#627D98]"
                        }`}
                      >
                        {row.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          row.show_on_homepage ? "bg-[#EFF7FF] text-[#0B69B7]" : "bg-[#F5F7FA] text-[#627D98]"
                        }`}
                      >
                        {row.show_on_homepage ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[#486581]">{row.read_time_minutes} min</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void openEdit(row)}
                          className={`${iconBtnClass} border-[#D9E1EA] text-[#0B69B7] hover:bg-[#EFF7FF]`}
                          title="Edit"
                          aria-label={`Edit ${row.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setDeleteTarget(row)}
                          className={`${iconBtnClass} border-[#F2C7C3] text-[#B42318] hover:bg-[#FFF1F0]`}
                          title="Delete"
                          aria-label={`Delete ${row.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete post?"
        description={deleteTarget ? `Delete “${deleteTarget.title}”? This cannot be undone.` : ""}
        confirmLabel="Delete post"
        loading={saving && Boolean(deleteTarget)}
        onConfirm={() => void confirmDeletePost()}
        onCancel={() => {
          if (!saving) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
