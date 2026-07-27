"use client";

import Link from "next/link";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type {
  AdminOriginCountry,
  AdminOriginCountryFaq,
  AdminOriginCountryInput,
  AdminOriginCountryVisaOption,
  AdminService,
} from "@/lib/admin-auth";

const inputClass =
  "mt-1 w-full min-w-0 rounded-[8px] border border-[#D9E1EA] bg-white px-3 py-2 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#009877]/20 focus:border-[#009877]";

export type OriginCountryFormState = {
  country_code: string;
  name: string;
  slug: string;
  destination_code: string;
  service_label: string;
  href: string;
  secondary_label: string;
  secondary_href: string;
  page_title: string;
  page_subtitle: string;
  faqs: AdminOriginCountryFaq[];
  visa_options: AdminOriginCountryVisaOption[];
  service_id: string | number;
  is_active: boolean;
  imageFile: File | null;
  clearImage: boolean;
  previewUrl: string;
};

export const emptyOriginCountryForm = (): OriginCountryFormState => ({
  country_code: "",
  name: "",
  slug: "",
  destination_code: "IN",
  service_label: "Indian e-Visa",
  href: "/indian-e-visa",
  secondary_label: "",
  secondary_href: "",
  page_title: "",
  page_subtitle: "",
  faqs: [],
  visa_options: [],
  service_id: "",
  is_active: true,
  imageFile: null,
  clearImage: false,
  previewUrl: "",
});

export function slugifyLocal(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function formFromCountry(row: AdminOriginCountry): OriginCountryFormState {
  return {
    country_code: row.country_code,
    name: row.name,
    slug: row.slug || "",
    destination_code: row.destination_code || "IN",
    service_label: row.service_label || "Indian e-Visa",
    href: row.stored_href || row.cta_href || "/indian-e-visa",
    secondary_label: row.secondary_label || "",
    secondary_href: row.secondary_href || "",
    page_title: row.page_title || "",
    page_subtitle: row.page_subtitle || "",
    faqs: Array.isArray(row.faqs) ? row.faqs : [],
    visa_options: Array.isArray(row.visa_options)
      ? row.visa_options.map((opt, index) => ({
          id: opt.id,
          service_id: opt.service_id,
          label: opt.label,
          fee: opt.fee,
          entries: opt.entries || "",
          max_stay: opt.max_stay || "",
          validity: opt.validity || "",
          travel_purpose: opt.travel_purpose || "Tourism",
          display_order: opt.display_order ?? (index + 1) * 10,
          is_active: opt.is_active !== false,
        }))
      : [],
    service_id: row.service_id ?? "",
    is_active: row.is_active,
    imageFile: null,
    clearImage: false,
    previewUrl: row.image_url || "",
  };
}

export function toOriginCountryInput(form: OriginCountryFormState): AdminOriginCountryInput {
  return {
    country_code: form.country_code.trim().toUpperCase(),
    name: form.name.trim(),
    slug: form.slug.trim() || slugifyLocal(form.name),
    destination_code: form.destination_code.trim().toUpperCase() || "IN",
    service_label: form.service_label.trim() || "Indian e-Visa",
    href: form.href.trim() || "/indian-e-visa",
    secondary_label: form.secondary_label.trim(),
    secondary_href: form.secondary_href.trim(),
    page_title: form.page_title.trim() || `Indian Visa for ${form.name.trim()}`,
    page_subtitle: form.page_subtitle.trim(),
    faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    visa_options: form.visa_options
      .filter((opt) => Number(opt.service_id) > 0 && String(opt.label || "").trim())
      .map((opt, index) => ({
        service_id: Number(opt.service_id),
        label: String(opt.label).trim(),
        fee: Number(opt.fee || 0),
        entries: (opt.entries || "").trim(),
        max_stay: (opt.max_stay || "").trim(),
        validity: (opt.validity || "").trim(),
        travel_purpose: (opt.travel_purpose || "Tourism").trim() || "Tourism",
        display_order: Number(opt.display_order ?? (index + 1) * 10),
        is_active: opt.is_active !== false,
      })),
    service_id: form.service_id === "" ? null : Number(form.service_id),
    is_active: form.is_active,
    image: form.imageFile,
    clear_image: form.clearImage,
  };
}

type Props = {
  mode: "create" | "edit";
  form: OriginCountryFormState;
  setForm: Dispatch<SetStateAction<OriginCountryFormState>>;
  services: AdminService[];
  saving: boolean;
  onSubmit: () => void;
  slugTouched: boolean;
  setSlugTouched: (value: boolean) => void;
};

export function OriginCountryForm({
  mode,
  form,
  setForm,
  services,
  saving,
  onSubmit,
  slugTouched,
  setSlugTouched,
}: Props) {
  const evisaServices = useMemo(
    () =>
      (services || []).filter((svc) => String(svc.service_type || "").toLowerCase().startsWith("evisa")),
    [services],
  );
  const [localError, setLocalError] = useState("");

  const addFaq = () =>
    setForm((prev) => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));

  const addVisaOption = () => {
    const first = evisaServices[0];
    setForm((prev) => ({
      ...prev,
      visa_options: [
        ...prev.visa_options,
        {
          service_id: first?.id || 0,
          label: first?.service_name || "Indian e-Visa",
          fee: first?.total_fee ?? first?.base_fee ?? 0,
          entries: "Multiple",
          max_stay: "180 Days",
          validity: String(first?.service_type || "").includes("5") ? "5 Years" : "1 Year",
          travel_purpose: "Tourism",
          display_order: (prev.visa_options.length + 1) * 10,
          is_active: true,
        },
      ],
    }));
  };

  const handleSave = () => {
    if (!form.country_code.trim() || !form.name.trim()) {
      setLocalError("Country code and name are required.");
      return;
    }
    setLocalError("");
    onSubmit();
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/origin-countries"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#486581] hover:text-[#009877]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-[#102A43]">
            {mode === "create" ? "Add origin country" : "Edit origin country"}
          </h1>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-[8px] bg-[#009877] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007a5f] disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "create" ? "Create country" : "Save changes"}
        </button>
      </div>

      {localError ? (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {localError}
        </p>
      ) : null}

      <section className="rounded-[12px] border border-[#E1E7EF] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#102A43]">Country basics</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#486581]">
            Country code
            <input
              className={inputClass}
              value={form.country_code}
              onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value.toUpperCase() }))}
              placeholder="USA"
            />
          </label>
          <label className="text-xs font-medium text-[#486581]">
            Name
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((p) => ({
                  ...p,
                  name,
                  slug: slugTouched ? p.slug : slugifyLocal(name),
                  page_title: p.page_title || (name ? `Indian Visa for ${name}` : ""),
                }));
              }}
              placeholder="United States"
            />
          </label>
          <label className="text-xs font-medium text-[#486581] sm:col-span-2">
            Slug
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((p) => ({ ...p, slug: slugifyLocal(e.target.value) }));
              }}
              placeholder="american-citizens"
            />
          </label>
          <label className="text-xs font-medium text-[#486581]">
            Destination
            <input
              className={inputClass}
              value={form.destination_code}
              onChange={(e) => setForm((p) => ({ ...p, destination_code: e.target.value.toUpperCase() }))}
            />
          </label>
          <label className="text-xs font-medium text-[#486581]">
            Card label
            <input
              className={inputClass}
              value={form.service_label}
              onChange={(e) => setForm((p) => ({ ...p, service_label: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#102A43] sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Active on homepage / public pages
          </label>
        </div>
      </section>

      <section className="rounded-[12px] border border-[#E1E7EF] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#102A43]">Landing page copy</h2>
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-[#486581]">
            Page title
            <input
              className={inputClass}
              value={form.page_title}
              onChange={(e) => setForm((p) => ({ ...p, page_title: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-[#486581]">
            Page subtitle
            <textarea
              className={`${inputClass} min-h-[88px]`}
              value={form.page_subtitle}
              onChange={(e) => setForm((p) => ({ ...p, page_subtitle: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[12px] border border-[#E1E7EF] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#102A43]">Card image</h2>
        <div className="mt-3 space-y-3">
          {form.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.previewUrl} alt="" className="h-36 w-full max-w-sm rounded-lg object-cover" />
          ) : (
            <div className="flex h-36 w-full max-w-sm items-center justify-center rounded-lg bg-[#EEF2F6] text-sm text-[#829AB1]">
              No image
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (!file) return;
              const preview = URL.createObjectURL(file);
              setForm((p) => ({ ...p, imageFile: file, clearImage: false, previewUrl: preview }));
            }}
          />
          {form.previewUrl ? (
            <button
              type="button"
              className="text-sm font-medium text-rose-600"
              onClick={() =>
                setForm((p) => ({ ...p, imageFile: null, clearImage: true, previewUrl: "" }))
              }
            >
              Remove image
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#E1E7EF] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#102A43]">e-Visa options (per country)</h2>
            <p className="mt-1 text-xs text-[#627D98]">
              These cards appear on `/visa/india/[slug]` and drive checkout price when started from a plan CTA.
            </p>
          </div>
          <button
            type="button"
            onClick={addVisaOption}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] px-3 py-1.5 text-sm font-medium text-[#102A43] hover:border-[#009877]"
          >
            <Plus className="h-4 w-4" />
            Add option
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {form.visa_options.length === 0 ? (
            <p className="text-sm text-[#829AB1]">No options yet — add at least one e-Visa plan for this country.</p>
          ) : (
            form.visa_options.map((opt, index) => (
              <div key={`${opt.service_id}-${index}`} className="rounded-[10px] border border-[#E1E7EF] p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-[#486581]">
                    Catalog service
                    <select
                      className={inputClass}
                      value={opt.service_id || ""}
                      onChange={(e) => {
                        const serviceId = Number(e.target.value);
                        const svc = evisaServices.find((s) => s.id === serviceId);
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = {
                            ...next[index],
                            service_id: serviceId,
                            label: next[index].label || svc?.service_name || "",
                            fee: next[index].fee || svc?.total_fee || 0,
                          };
                          return { ...p, visa_options: next };
                        });
                      }}
                    >
                      <option value="">Select…</option>
                      {evisaServices.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.service_name} ({svc.service_type})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Label
                    <input
                      className={inputClass}
                      value={opt.label}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], label: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Fee (GBP)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      value={opt.fee}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], fee: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Entries
                    <input
                      className={inputClass}
                      value={opt.entries || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], entries: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Max stay
                    <input
                      className={inputClass}
                      value={opt.max_stay || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], max_stay: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Validity
                    <input
                      className={inputClass}
                      value={opt.validity || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], validity: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="text-xs font-medium text-[#486581]">
                    Travel purpose
                    <input
                      className={inputClass}
                      value={opt.travel_purpose || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], travel_purpose: value };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 self-end text-sm text-[#102A43]">
                    <input
                      type="checkbox"
                      checked={opt.is_active !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((p) => {
                          const next = [...p.visa_options];
                          next[index] = { ...next[index], is_active: checked };
                          return { ...p, visa_options: next };
                        });
                      }}
                    />
                    Active
                  </label>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rose-600"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      visa_options: p.visa_options.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove option
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#E1E7EF] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#102A43]">FAQs</h2>
          <button
            type="button"
            onClick={addFaq}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D9E1EA] px-3 py-1.5 text-sm font-medium text-[#102A43]"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {form.faqs.map((faq, index) => (
            <div key={index} className="rounded-[10px] border border-[#E1E7EF] p-3">
              <input
                className={inputClass}
                placeholder="Question"
                value={faq.question}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) => {
                    const next = [...p.faqs];
                    next[index] = { ...next[index], question: value };
                    return { ...p, faqs: next };
                  });
                }}
              />
              <textarea
                className={`${inputClass} mt-2 min-h-[72px]`}
                placeholder="Answer"
                value={faq.answer}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) => {
                    const next = [...p.faqs];
                    next[index] = { ...next[index], answer: value };
                    return { ...p, faqs: next };
                  });
                }}
              />
              <button
                type="button"
                className="mt-2 text-sm font-medium text-rose-600"
                onClick={() => setForm((p) => ({ ...p, faqs: p.faqs.filter((_, i) => i !== index) }))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
