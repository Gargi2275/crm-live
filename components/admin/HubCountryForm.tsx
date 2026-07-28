"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import type {
  AdminHubCity,
  AdminHubCountry,
  AdminHubCountryInput,
  AdminHubOffering,
  AdminService,
} from "@/lib/admin-auth";

const fieldClass =
  "mt-1 w-full rounded-[8px] border border-[#D9E1EA] bg-white px-2.5 py-1.5 text-sm text-[#102A43]";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type CityRow = AdminHubCity & { key: string; offerings: OfferingRow[]; feesOpen?: boolean };
type OfferingRow = AdminHubOffering & { key: string };

function withKeys<T extends { id?: number }>(rows: T[], prefix: string): (T & { key: string })[] {
  return rows.map((row, index) => ({
    ...row,
    key:
      row.id != null
        ? `${prefix}-${row.id}`
        : `${prefix}-new-${index}-${Math.random().toString(36).slice(2, 7)}`,
  }));
}

function SortableShell({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
      className={`rounded-lg border border-[#EEF2F6] bg-white p-3 ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex gap-2">
        <span
          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#829AB1]"
          aria-hidden
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <div
          className="min-w-0 flex-1"
          onPointerDown={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest("input, select, textarea, button, a, label")) {
              e.stopPropagation();
            }
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type HubCountryFormProps = {
  initial?: AdminHubCountry | null;
  services: AdminService[];
  saving: boolean;
  submitLabel: string;
  onSubmit: (input: AdminHubCountryInput) => Promise<void>;
};

export function HubCountryForm({
  initial,
  services,
  saving,
  submitLabel,
  onSubmit,
}: HubCountryFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [currencyCode, setCurrencyCode] = useState(initial?.currency_code || "USD");
  const [currencySymbol, setCurrencySymbol] = useState(initial?.currency_symbol || "$");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [cities, setCities] = useState<CityRow[]>(() =>
    (initial?.cities || []).map((city, index) => ({
      ...city,
      key: city.id != null ? `city-${city.id}` : `city-new-${index}`,
      offerings: withKeys(city.offerings || [], `city-${city.id || index}-offering`),
      feesOpen: false,
    })),
  );
  const [offerings, setOfferings] = useState<OfferingRow[]>(() =>
    withKeys(initial?.offerings || [], "offering"),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const serviceOptions = useMemo(
    () => services.filter((s) => s.is_active !== false),
    [services],
  );

  const attachedIds = useMemo(
    () => new Set(offerings.map((o) => Number(o.service_id)).filter(Boolean)),
    [offerings],
  );

  const availableToAdd = useMemo(
    () => serviceOptions.filter((s) => !attachedIds.has(s.id)),
    [serviceOptions, attachedIds],
  );

  const serviceById = useMemo(() => {
    const map = new Map<number, AdminService>();
    for (const s of serviceOptions) map.set(s.id, s);
    return map;
  }, [serviceOptions]);

  const updateCity = (key: string, patch: Partial<CityRow>) => {
    setCities((prev) => prev.map((city) => (city.key === key ? { ...city, ...patch } : city)));
  };

  const setCityServiceMode = (
    cityKey: string,
    serviceId: number,
    mode: "inherit" | "custom" | "hidden",
    countryOffering: OfferingRow,
  ) => {
    setCities((prev) =>
      prev.map((city) => {
        if (city.key !== cityKey) return city;
        const without = (city.offerings || []).filter((o) => Number(o.service_id) !== serviceId);
        if (mode === "inherit") {
          return { ...city, offerings: without };
        }
        const existing = (city.offerings || []).find((o) => Number(o.service_id) === serviceId);
        const nextRow: OfferingRow = {
          key: existing?.key || `city-off-${serviceId}-${Date.now()}`,
          id: existing?.id,
          service_id: serviceId,
          service_name: countryOffering.service_name,
          service_type: countryOffering.service_type,
          govt_fee: existing?.govt_fee ?? countryOffering.govt_fee,
          service_fee: existing?.service_fee ?? countryOffering.service_fee,
          processing_time: existing?.processing_time || countryOffering.processing_time,
          validity: existing?.validity || countryOffering.validity,
          is_popular: existing?.is_popular ?? countryOffering.is_popular,
          is_active: mode !== "hidden",
          display_order: countryOffering.display_order,
        };
        return { ...city, offerings: [...without, nextRow] };
      }),
    );
  };

  const updateCityOffering = (cityKey: string, offeringKey: string, patch: Partial<AdminHubOffering>) => {
    setCities((prev) =>
      prev.map((city) => {
        if (city.key !== cityKey) return city;
        return {
          ...city,
          offerings: (city.offerings || []).map((row) =>
            row.key === offeringKey ? { ...row, ...patch } : row,
          ),
        };
      }),
    );
  };

  const updateOffering = (key: string, patch: Partial<AdminHubOffering>) => {
    setOfferings((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addServices = (ids: number[]) => {
    const toAdd = serviceOptions.filter((s) => ids.includes(s.id) && !attachedIds.has(s.id));
    if (!toAdd.length) {
      toast.error("Select at least one service that isn’t already added");
      return;
    }
    setOfferings((prev) => [
      ...prev,
      ...toAdd.map((svc, index) => ({
        key: `offering-new-${svc.id}-${Date.now()}-${index}`,
        service_id: svc.id,
        service_name: svc.service_name,
        service_type: svc.service_type,
        govt_fee:
          svc.government_fee != null && Number(svc.government_fee) !== 0
            ? String(svc.government_fee)
            : null,
        service_fee: String(svc.base_fee ?? svc.total_fee ?? "0"),
        processing_time: "",
        validity: svc.service_type.includes("oci") ? "Lifelong" : "",
        is_popular: prev.length === 0 && index === 0,
        is_active: true,
        display_order: (prev.length + index + 1) * 10,
      })),
    ]);
    setPickerOpen(false);
    toast.success(`Added ${toAdd.length} service${toAdd.length === 1 ? "" : "s"}`);
  };

  const setPopular = (key: string) => {
    setOfferings((prev) =>
      prev.map((row) => ({
        ...row,
        is_popular: row.key === key,
      })),
    );
  };

  const onCityDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCities((prev) => {
      const oldIndex = prev.findIndex((row) => row.key === active.id);
      const newIndex = prev.findIndex((row) => row.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const onOfferingDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOfferings((prev) => {
      const oldIndex = prev.findIndex((row) => row.key === active.id);
      const newIndex = prev.findIndex((row) => row.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (offerings.some((o) => !o.service_id)) {
      toast.error("Every offering needs a service selected");
      return;
    }
    await onSubmit({
      name: name.trim(),
      slug: (slug || slugify(name)).trim(),
      currency_code: currencyCode.trim() || "USD",
      currency_symbol: currencySymbol.trim() || "$",
      is_active: isActive,
      cities: cities.map((city, index) => ({
        id: city.id,
        name: city.name.trim(),
        slug: (city.slug || slugify(city.name)).trim(),
        is_active: city.is_active,
        display_order: (index + 1) * 10,
        offerings: (city.offerings || []).map((row, oIndex) => ({
          id: row.id,
          service_id: Number(row.service_id),
          govt_fee: row.govt_fee,
          service_fee: row.service_fee,
          processing_time: row.processing_time,
          validity: row.validity,
          is_popular: row.is_popular,
          is_active: row.is_active,
          display_order: (oIndex + 1) * 10,
        })),
      })),
      offerings: offerings.map((row, index) => ({
        id: row.id,
        service_id: Number(row.service_id),
        govt_fee: row.govt_fee,
        service_fee: row.service_fee,
        processing_time: row.processing_time,
        validity: row.validity,
        is_popular: row.is_popular,
        is_active: row.is_active,
        display_order: (index + 1) * 10,
      })),
    });
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <section className="rounded-xl border border-[#E1E7EF] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#102A43]">1. Country basics</h2>
        <p className="mt-1 text-xs text-[#829AB1]">
          Public page: <span className="font-medium text-[#486581]">/service/{slug || "…"}</span>
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-[#486581]">
            Name
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!initial) setSlug(slugify(e.target.value));
              }}
              required
            />
          </label>
          <label className="text-sm text-[#486581]">
            URL slug
            <input className={fieldClass} value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label className="text-sm text-[#486581]">
            Currency code
            <input
              className={fieldClass}
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="USD"
            />
          </label>
          <label className="text-sm text-[#486581]">
            Currency symbol (shown on site)
            <input
              className={fieldClass}
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="$"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#486581] sm:col-span-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[#D9E1EA]"
            />
            Show this country on the website
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-[#E1E7EF] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#102A43]">2. Services &amp; fees</h2>
            <p className="mt-1 max-w-xl text-xs text-[#829AB1]">
              Pick services from your catalog, set location fees, drag to reorder. Star one as
              Featured (shown in the hub hero). Leave govt fee empty when there isn’t one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#009877] px-3 py-2 text-sm font-semibold text-white hover:bg-[#007a5f]"
          >
            <Plus className="h-4 w-4" />
            Add from catalog
          </button>
        </div>

        {pickerOpen ? (
          <ServicePicker
            available={availableToAdd}
            onCancel={() => setPickerOpen(false)}
            onAdd={addServices}
          />
        ) : null}

        <div className="mt-4 space-y-3">
          {offerings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D9E1EA] bg-[#F8FAFC] px-4 py-8 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-[#009877]" />
              <p className="mt-2 text-sm font-medium text-[#102A43]">No services on this hub yet</p>
              <p className="mt-1 text-xs text-[#829AB1]">
                Click “Add from catalog” to attach OCI / Passport / other services.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onOfferingDragEnd}>
              <SortableContext items={offerings.map((o) => o.key)} strategy={verticalListSortingStrategy}>
                {offerings.map((row) => {
                  const svc = serviceById.get(Number(row.service_id));
                  return (
                    <SortableShell key={row.key} id={row.key} disabled={saving}>
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-[#102A43]">
                              {svc?.service_name || row.service_name || `Service #${row.service_id}`}
                            </p>
                            <p className="text-xs text-[#829AB1]">
                              {svc?.service_type || row.service_type || "—"}
                              {svc?.category ? ` · ${svc.category}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPopular(row.key)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.is_popular
                                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  : "bg-[#F0F4F8] text-[#627D98] hover:bg-amber-50 hover:text-amber-700"
                              }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${row.is_popular ? "fill-amber-500" : ""}`} />
                              {row.is_popular ? "Featured" : "Make featured"}
                            </button>
                            <label className="flex items-center gap-1.5 text-xs text-[#486581]">
                              <input
                                type="checkbox"
                                checked={row.is_active}
                                onChange={(e) => updateOffering(row.key, { is_active: e.target.checked })}
                              />
                              Active
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setOfferings((prev) => prev.filter((item) => item.key !== row.key))
                              }
                              className="inline-flex items-center gap-1 text-xs text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-xs text-[#486581]">
                            Govt fee ({currencySymbol})
                            <input
                              className={fieldClass}
                              value={row.govt_fee ?? ""}
                              onChange={(e) =>
                                updateOffering(row.key, {
                                  govt_fee: e.target.value === "" ? null : e.target.value,
                                })
                              }
                              placeholder="Leave blank if none"
                              inputMode="decimal"
                            />
                          </label>
                          <label className="text-xs text-[#486581]">
                            Your fee ({currencySymbol})
                            <input
                              className={fieldClass}
                              value={row.service_fee}
                              onChange={(e) => updateOffering(row.key, { service_fee: e.target.value })}
                              inputMode="decimal"
                            />
                          </label>
                          <label className="text-xs text-[#486581]">
                            Processing time
                            <input
                              className={fieldClass}
                              value={row.processing_time}
                              onChange={(e) =>
                                updateOffering(row.key, { processing_time: e.target.value })
                              }
                              placeholder="e.g. 6-7 Weeks"
                            />
                          </label>
                          <label className="text-xs text-[#486581]">
                            Validity
                            <input
                              className={fieldClass}
                              value={row.validity}
                              onChange={(e) => updateOffering(row.key, { validity: e.target.value })}
                              placeholder="e.g. Lifelong"
                            />
                          </label>
                        </div>
                      </div>
                    </SortableShell>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#E1E7EF] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#102A43]">3. Cities (footer + city pages)</h2>
            <p className="mt-1 text-xs text-[#829AB1]">
              Uncheck Active to hide a city from the footer. Open “City fees” to change or disable a
              service for that city only — other cities keep country prices.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setCities((prev) => [
                ...prev,
                {
                  key: `city-new-${Date.now()}`,
                  name: "",
                  slug: "",
                  is_active: true,
                  display_order: (prev.length + 1) * 10,
                  offerings: [],
                  feesOpen: false,
                },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1EA] px-3 py-1.5 text-sm font-medium text-[#486581] hover:bg-[#F0F4F8]"
          >
            <Plus className="h-4 w-4" />
            Add city
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {cities.length === 0 ? (
            <p className="rounded-lg bg-[#F8FAFC] px-3 py-4 text-sm text-[#829AB1]">
              Optional — only USA / UK / Australia / Canada typically list cities.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCityDragEnd}>
              <SortableContext items={cities.map((c) => c.key)} strategy={verticalListSortingStrategy}>
                {cities.map((city) => {
                  const overrideCount = (city.offerings || []).length;
                  return (
                    <SortableShell key={city.key} id={city.key} disabled={saving}>
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
                          <input
                            className={fieldClass}
                            placeholder="City name"
                            value={city.name}
                            onChange={(e) =>
                              updateCity(city.key, {
                                name: e.target.value,
                                slug: city.id ? city.slug : slugify(e.target.value),
                              })
                            }
                          />
                          <input
                            className={fieldClass}
                            placeholder="slug"
                            value={city.slug}
                            onChange={(e) => updateCity(city.key, { slug: e.target.value })}
                          />
                          <label className="flex items-center gap-2 text-xs text-[#486581]">
                            <input
                              type="checkbox"
                              checked={city.is_active}
                              onChange={(e) => updateCity(city.key, { is_active: e.target.checked })}
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            onClick={() => updateCity(city.key, { feesOpen: !city.feesOpen })}
                            className="rounded-lg border border-[#D9E1EA] px-2.5 py-1.5 text-xs font-semibold text-[#009877] hover:bg-[#F3FBF8]"
                          >
                            City fees{overrideCount ? ` (${overrideCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCities((prev) => prev.filter((row) => row.key !== city.key))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#486581] hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Remove city"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {city.feesOpen ? (
                          <div className="rounded-lg border border-[#E1E7EF] bg-[#F8FAFC] p-3">
                            {!offerings.length ? (
                              <p className="text-xs text-[#829AB1]">
                                Add country services in section 2 first, then customize them per city.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-xs text-[#627D98]">
                                  Default = same as country. Custom price = city-only fees. Hide =
                                  don’t show this service on /service/{slug || "…"}/{city.slug || "…"}.
                                </p>
                                {offerings.map((countryOffering) => {
                                  const override = (city.offerings || []).find(
                                    (o) => Number(o.service_id) === Number(countryOffering.service_id),
                                  );
                                  const mode: "inherit" | "custom" | "hidden" = !override
                                    ? "inherit"
                                    : override.is_active
                                      ? "custom"
                                      : "hidden";
                                  return (
                                    <div
                                      key={`${city.key}-${countryOffering.service_id}`}
                                      className="rounded-lg border border-[#E1E7EF] bg-white p-3"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-[#102A43]">
                                          {countryOffering.service_name ||
                                            serviceById.get(Number(countryOffering.service_id))
                                              ?.service_name ||
                                            `Service #${countryOffering.service_id}`}
                                        </p>
                                        <select
                                          className="rounded-md border border-[#D9E1EA] bg-white px-2 py-1 text-xs text-[#102A43]"
                                          value={mode}
                                          onChange={(e) =>
                                            setCityServiceMode(
                                              city.key,
                                              Number(countryOffering.service_id),
                                              e.target.value as "inherit" | "custom" | "hidden",
                                              countryOffering,
                                            )
                                          }
                                        >
                                          <option value="inherit">Use country price</option>
                                          <option value="custom">Custom city price</option>
                                          <option value="hidden">Hide on this city</option>
                                        </select>
                                      </div>
                                      {mode === "custom" && override ? (
                                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                          <label className="text-xs text-[#486581]">
                                            Govt ({currencySymbol})
                                            <input
                                              className={fieldClass}
                                              value={override.govt_fee ?? ""}
                                              onChange={(e) =>
                                                updateCityOffering(city.key, override.key, {
                                                  govt_fee:
                                                    e.target.value === "" ? null : e.target.value,
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="text-xs text-[#486581]">
                                            Your fee ({currencySymbol})
                                            <input
                                              className={fieldClass}
                                              value={override.service_fee}
                                              onChange={(e) =>
                                                updateCityOffering(city.key, override.key, {
                                                  service_fee: e.target.value,
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="text-xs text-[#486581]">
                                            Processing
                                            <input
                                              className={fieldClass}
                                              value={override.processing_time}
                                              onChange={(e) =>
                                                updateCityOffering(city.key, override.key, {
                                                  processing_time: e.target.value,
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="text-xs text-[#486581]">
                                            Validity
                                            <input
                                              className={fieldClass}
                                              value={override.validity}
                                              onChange={(e) =>
                                                updateCityOffering(city.key, override.key, {
                                                  validity: e.target.value,
                                                })
                                              }
                                            />
                                          </label>
                                        </div>
                                      ) : null}
                                      {mode === "hidden" ? (
                                        <p className="mt-2 text-xs text-rose-600">
                                          Hidden on this city page only. Other cities / country page
                                          unchanged.
                                        </p>
                                      ) : null}
                                      {mode === "inherit" ? (
                                        <p className="mt-2 text-xs text-[#829AB1]">
                                          Showing country fees: {currencySymbol}
                                          {countryOffering.service_fee}
                                          {countryOffering.govt_fee
                                            ? ` + govt ${currencySymbol}${countryOffering.govt_fee}`
                                            : ""}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </SortableShell>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E1E7EF] bg-white px-4 py-3">
        <Link href="/admin/service-hubs" className="text-sm font-medium text-[#486581] hover:text-[#102A43]">
          Back to list
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#009877] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#007a5f] disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ServicePicker({
  available,
  onCancel,
  onAdd,
}: {
  available: AdminService[];
  onCancel: () => void;
  onAdd: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="mt-4 rounded-xl border border-[#C8E7DE] bg-[#F3FBF8] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#102A43]">Choose catalog services to add</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#D9E1EA] px-3 py-1.5 text-xs font-medium text-[#486581]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onAdd(selected)}
            disabled={!selected.length}
            className="rounded-lg bg-[#009877] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Add selected ({selected.length})
          </button>
        </div>
      </div>
      {available.length === 0 ? (
        <p className="mt-3 text-sm text-[#829AB1]">All active catalog services are already attached.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {available.map((svc) => (
            <li key={svc.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#E1E7EF] bg-white px-3 py-2 text-sm hover:border-[#009877]/50">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.includes(svc.id)}
                  onChange={() => toggle(svc.id)}
                />
                <span>
                  <span className="font-medium text-[#102A43]">{svc.service_name}</span>
                  <span className="mt-0.5 block text-xs text-[#829AB1]">
                    {svc.service_type}
                    {svc.category ? ` · ${svc.category}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-[#009877] hover:underline"
          onClick={() => setSelected(available.map((s) => s.id))}
        >
          Select all
        </button>
      ) : null}
    </div>
  );
}
