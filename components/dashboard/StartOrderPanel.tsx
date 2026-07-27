"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  CheckoutShell,
  VisamentOrderSummary,
  checkoutFieldClass,
  checkoutLabelClass,
  type VisamentSummaryApplicant,
} from "@/components/checkout/CheckoutShell";

export type StartOrderServiceOption = {
  id: string;
  name: string;
  description: string;
  price: string;
  feeNumber: number | null;
  category?: string;
  categoryName?: string;
  /** Journey/backend mapping id (e.g. new-oci). Selection UI uses unique `id` so all catalog rows show. */
  journeyId?: string | null;
};

export type StartOrderApplicant = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  applyingFrom: string;
};

type StartOrderPanelProps = {
  services: StartOrderServiceOption[];
  selectedServiceId: string | null;
  showAllServicesInitially?: boolean;
  primaryApplicant: StartOrderApplicant;
  extraApplicants: StartOrderApplicant[];
  apiLoading?: boolean;
  error?: string | null;
  onPrimaryChange: (patch: Partial<StartOrderApplicant>) => void;
  onAddApplicant: () => void;
  onUpdateApplicant: (id: string, patch: Partial<StartOrderApplicant>) => void;
  onRemoveApplicant: (id: string) => void;
  onSelectService: (serviceId: string) => void;
  onContinue: (cart: StartOrderCartEntry[]) => void;
};

export type StartOrderCartEntry = {
  applicant: StartOrderApplicant;
  serviceIds: string[];
};

const APPLYING_FROM_OPTIONS = ["United Kingdom", "United States", "Canada", "Australia", "UAE", "Other"];

function parsePrice(price: string, feeNumber: number | null): number {
  if (typeof feeNumber === "number" && Number.isFinite(feeNumber)) return feeNumber;
  const match = price.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "£0";
  return `£${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function StartOrderPanel({
  services,
  selectedServiceId,
  showAllServicesInitially = false,
  primaryApplicant,
  extraApplicants,
  apiLoading,
  error,
  onPrimaryChange,
  onAddApplicant,
  onUpdateApplicant,
  onRemoveApplicant,
  onSelectService,
  onContinue,
}: StartOrderPanelProps) {
  void showAllServicesInitially;

  const allApplicants = useMemo(() => [primaryApplicant, ...extraApplicants], [primaryApplicant, extraApplicants]);
  const [activeApplicantId, setActiveApplicantId] = useState(primaryApplicant.id);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [applicantServices, setApplicantServices] = useState<Record<string, string[]>>(() => ({
    [primaryApplicant.id]: selectedServiceId ? [selectedServiceId] : [],
  }));
  const [touched, setTouched] = useState({ name: false, email: false });

  const serviceGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; services: StartOrderServiceOption[] }>();
    for (const service of services) {
      if (service.id === "undecided") continue;
      const key = service.category || "other";
      const label =
        service.categoryName ||
        key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const existing = map.get(key);
      if (existing) existing.services.push(service);
      else map.set(key, { key, label, services: [service] });
    }
    return Array.from(map.values());
  }, [services]);

  const resolveOptionId = (serviceKey: string | null | undefined): string | null => {
    if (!serviceKey) return null;
    const direct = services.find((s) => s.id === serviceKey);
    if (direct) return direct.id;
    const byJourney = services.find((s) => s.journeyId === serviceKey);
    if (byJourney) return byJourney.id;
    return serviceKey;
  };

  // Keep URL/preselected service checked for primary applicant — never hide other services
  useEffect(() => {
    const optionId = resolveOptionId(selectedServiceId);
    if (!optionId || optionId === "undecided") return;
    setApplicantServices((current) => {
      const prev = current[primaryApplicant.id] || [];
      if (prev.includes(optionId)) return current;
      // Prefer journey match: if prev has raw journey id, replace with option id
      const withoutAlias = prev.filter((id) => id !== selectedServiceId);
      return {
        ...current,
        [primaryApplicant.id]: [...withoutAlias, optionId],
      };
    });
  }, [selectedServiceId, primaryApplicant.id, services]);

  useEffect(() => {
    setApplicantServices((current) => {
      const next = { ...current };
      const ids = new Set(allApplicants.map((a) => a.id));
      for (const applicant of allApplicants) {
        if (!next[applicant.id]) next[applicant.id] = [];
      }
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) delete next[key];
      }
      return next;
    });
    if (!allApplicants.some((a) => a.id === activeApplicantId)) {
      setActiveApplicantId(primaryApplicant.id);
    }
  }, [allApplicants, activeApplicantId, primaryApplicant.id]);

  useEffect(() => {
    if (!serviceGroups.length) return;
    // Expand every category for every applicant so all services stay visible
    setExpandedCategories((current) => {
      const next = { ...current };
      let changed = false;
      for (const applicant of allApplicants) {
        for (const group of serviceGroups) {
          const key = `${applicant.id}:${group.key}`;
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        }
      }
      return changed ? next : current;
    });
  }, [serviceGroups, allApplicants]);

  const primarySelectedServices = applicantServices[primaryApplicant.id] || [];
  const currentServiceId = primarySelectedServices[0] || selectedServiceId || services[0]?.id || "";

  useEffect(() => {
    if (!currentServiceId || currentServiceId === "undecided") return;
    const row = services.find((s) => s.id === currentServiceId);
    const journeyKey = row?.journeyId || currentServiceId;
    if (selectedServiceId === journeyKey || selectedServiceId === currentServiceId) return;
    onSelectService(journeyKey);
  }, [currentServiceId, onSelectService, selectedServiceId, services]);

  const serviceById = useMemo(() => {
    const map = new Map<string, StartOrderServiceOption>();
    for (const service of services) map.set(service.id, service);
    return map;
  }, [services]);

  const orderTotal = useMemo(() => {
    let total = 0;
    for (const applicant of allApplicants) {
      for (const serviceId of applicantServices[applicant.id] || []) {
        const row = serviceById.get(serviceId);
        if (!row) continue;
        total += parsePrice(row.price, row.feeNumber);
      }
    }
    return total;
  }, [allApplicants, applicantServices, serviceById]);

  const summaryApplicants: VisamentSummaryApplicant[] = useMemo(() => {
    return allApplicants.map((applicant, index) => {
      const selected = applicantServices[applicant.id] || [];
      const items = selected
        .map((serviceId) => {
          const row = serviceById.get(serviceId);
          if (!row) return null;
          return { id: `${applicant.id}-${serviceId}`, label: row.name, amountLabel: row.price };
        })
        .filter((row): row is { id: string; label: string; amountLabel: string } => Boolean(row));
      const subtotal = selected.reduce((sum, serviceId) => {
        const row = serviceById.get(serviceId);
        return sum + (row ? parsePrice(row.price, row.feeNumber) : 0);
      }, 0);
      return {
        id: applicant.id,
        title: applicant.fullName.trim() || `Applicant ${index + 1}`,
        subtotalLabel: items.length ? formatMoney(subtotal) : "—",
        items,
      };
    });
  }, [allApplicants, applicantServices, serviceById]);

  const toggleApplicantService = (applicantId: string, serviceId: string) => {
    setActiveApplicantId(applicantId);
    setApplicantServices((current) => {
      const prev = current[applicantId] || [];
      const exists = prev.includes(serviceId);
      const nextList = exists ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      return { ...current, [applicantId]: nextList };
    });
  };

  const nameError = touched.name && !primaryApplicant.fullName.trim();
  const emailError =
    touched.email &&
    (!primaryApplicant.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryApplicant.email.trim()));

  const renderApplicantFields = (
    applicant: StartOrderApplicant,
    opts: { isPrimary: boolean; indexLabel: string },
  ) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={checkoutLabelClass}>
          Name of Applicant {opts.isPrimary ? <span className="text-[#E11D48]">*</span> : null}
        </label>
        <input
          type="text"
          value={applicant.fullName}
          disabled={apiLoading}
          placeholder="As on passport"
          className={`${checkoutFieldClass} ${opts.isPrimary && nameError ? "border-[#E11D48]" : ""}`}
          onBlur={() => {
            if (opts.isPrimary) setTouched((t) => ({ ...t, name: true }));
          }}
          onChange={(e) =>
            opts.isPrimary
              ? onPrimaryChange({ fullName: e.target.value })
              : onUpdateApplicant(applicant.id, { fullName: e.target.value })
          }
        />
        {opts.isPrimary && nameError ? (
          <p className="mt-1 text-[11px] font-medium text-[#E11D48]">Name is required</p>
        ) : null}
      </div>
      <div>
        <label className={checkoutLabelClass}>Mobile Number</label>
        <input
          type="tel"
          value={applicant.mobile}
          disabled={apiLoading}
          placeholder="+44 7000 000000"
          className={checkoutFieldClass}
          onChange={(e) =>
            opts.isPrimary
              ? onPrimaryChange({ mobile: e.target.value })
              : onUpdateApplicant(applicant.id, { mobile: e.target.value })
          }
        />
      </div>
      <div>
        <label className={checkoutLabelClass}>
          Email Address {opts.isPrimary ? <span className="text-[#E11D48]">*</span> : null}
        </label>
        <input
          type="email"
          value={applicant.email}
          disabled={apiLoading}
          placeholder="you@email.com"
          className={`${checkoutFieldClass} ${opts.isPrimary && emailError ? "border-[#E11D48]" : ""}`}
          onBlur={() => {
            if (opts.isPrimary) setTouched((t) => ({ ...t, email: true }));
          }}
          onChange={(e) =>
            opts.isPrimary
              ? onPrimaryChange({ email: e.target.value })
              : onUpdateApplicant(applicant.id, { email: e.target.value })
          }
        />
        {opts.isPrimary && emailError ? (
          <p className="mt-1 text-[11px] font-medium text-[#E11D48]">Valid email is required</p>
        ) : (
          <p className="mt-1 text-[11px] text-[#829AB1]">We&apos;ll send a verification code to this email.</p>
        )}
      </div>
      <div>
        <label className={checkoutLabelClass}>
          Applying From {opts.isPrimary ? <span className="text-[#E11D48]">*</span> : null}
        </label>
        <select
          value={applicant.applyingFrom}
          disabled={apiLoading}
          className={checkoutFieldClass}
          onChange={(e) =>
            opts.isPrimary
              ? onPrimaryChange({ applyingFrom: e.target.value })
              : onUpdateApplicant(applicant.id, { applyingFrom: e.target.value })
          }
        >
          {APPLYING_FROM_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderServiceChooser = (applicant: StartOrderApplicant) => {
    const selected = applicantServices[applicant.id] || [];
    return (
      <div className="mt-5">
        <p className="text-[14px] font-semibold text-[#0F1F3D]">What documents do you need?</p>
        <p className="mt-0.5 text-[12px] text-[#829AB1]">
          All categories are listed below. Pick one or more services for this applicant.
        </p>

        <div className="mt-3 space-y-2">
          {serviceGroups.map((group) => {
            const expandKey = `${applicant.id}:${group.key}`;
            const open = Boolean(expandedCategories[expandKey]);
            const isSingle = group.services.length === 1;

            // Visament: single service = flat selectable row
            if (isSingle) {
              const service = group.services[0];
              const checked = selected.includes(service.id);
              return (
                <button
                  key={`${applicant.id}-${service.id}`}
                  type="button"
                  disabled={apiLoading}
                  onClick={() => toggleApplicantService(applicant.id, service.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    checked
                      ? "border-[#1A56DB] bg-[#EFF6FF]"
                      : "border-[#D7E4F4] bg-white hover:border-[#B8C9DE]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-[#1A56DB] bg-[#1A56DB] text-white" : "border-[#C7D4E8] bg-white"
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="truncate text-[13px] font-semibold text-[#0F1F3D]">{service.name}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-[#102A43]">{service.price}</span>
                </button>
              );
            }

            // Visament: multi service category = accordion with checkbox grid
            const groupSelectedCount = group.services.filter((s) => selected.includes(s.id)).length;
            return (
              <div
                key={`${applicant.id}-${group.key}`}
                className={`overflow-hidden rounded-xl border ${
                  open ? "border-[#1A56DB]/50" : "border-[#D7E4F4]"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedCategories((current) => ({
                      ...current,
                      [expandKey]: !current[expandKey],
                    }))
                  }
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left ${
                    open ? "bg-[#EFF6FF]" : "bg-white hover:bg-[#F8FBFF]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F1F3D]">{group.label}</p>
                    {groupSelectedCount ? (
                      <p className="text-[11px] text-[#1A56DB]">
                        {groupSelectedCount} selected
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {groupSelectedCount ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A56DB] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-4 w-4 text-[#627D98] transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {open ? (
                  <div className="grid gap-2 border-t border-[#DCE7F5] bg-white p-2.5 sm:grid-cols-2">
                    {group.services.map((service) => {
                      const checked = selected.includes(service.id);
                      return (
                        <button
                          key={`${applicant.id}-${service.id}`}
                          type="button"
                          disabled={apiLoading}
                          onClick={() => toggleApplicantService(applicant.id, service.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                            checked
                              ? "border-[#1A56DB] bg-[#1A56DB] text-white"
                              : "border-[#E1E7EF] bg-white text-[#102A43] hover:border-[#1A56DB]/40"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked ? "border-white bg-white text-[#1A56DB]" : "border-[#C7D4E8] bg-white"
                              }`}
                            >
                              {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                            </span>
                            <span className={`truncate text-[12px] font-semibold ${checked ? "text-white" : ""}`}>
                              {service.name}
                            </span>
                          </span>
                          <span className={`shrink-0 text-[12px] font-bold ${checked ? "text-white" : "text-[#102A43]"}`}>
                            {service.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <CheckoutShell
      title="Start your order"
      currentStep={0}
      summary={
        <VisamentOrderSummary applicants={summaryApplicants} totalLabel={formatMoney(orderTotal)} />
      }
      form={
        <div className="space-y-5">
          {renderApplicantFields(primaryApplicant, { isPrimary: true, indexLabel: "Applicant 1" })}
          {renderServiceChooser(primaryApplicant)}

          {extraApplicants.map((applicant, index) => (
            <div key={applicant.id} className="rounded-2xl border border-[#D7E4F4] bg-[#F8FBFF] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-[#0F1F3D]">Applicant {index + 2}</p>
                <button
                  type="button"
                  onClick={() => onRemoveApplicant(applicant.id)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#E11D48]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              {renderApplicantFields(applicant, { isPrimary: false, indexLabel: `Applicant ${index + 2}` })}
              {renderServiceChooser(applicant)}
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t border-[#EEF2F7] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onAddApplicant}
              disabled={apiLoading}
              className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#1A56DB] hover:underline disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Applicant
            </button>

            <button
              type="button"
              disabled={apiLoading || primarySelectedServices.length === 0}
              onClick={() => {
                setTouched({ name: true, email: true });
                if (!primaryApplicant.fullName.trim() || !primaryApplicant.email.trim()) return;
                const incomplete = extraApplicants.find(
                  (row) => !row.fullName.trim() || !row.email.trim(),
                );
                if (incomplete) return;
                const withoutServices = allApplicants.find(
                  (row) => !(applicantServices[row.id] || []).length,
                );
                if (withoutServices) return;
                onContinue(
                  allApplicants.map((applicant) => ({
                    applicant,
                    serviceIds: applicantServices[applicant.id] || [],
                  })),
                );
              }}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#1A56DB] px-10 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1648B5] disabled:cursor-not-allowed disabled:bg-[#C5D0DE] sm:w-auto sm:min-w-[200px]"
            >
              {apiLoading ? "Please wait…" : "Continue"}
            </button>
          </div>

          {extraApplicants.some((row) => !(applicantServices[row.id] || []).length) ? (
            <p className="text-[12px] font-medium text-[#E11D48]">
              Each applicant needs at least one service selected.
            </p>
          ) : null}

          {error ? <p className="text-[13px] font-medium text-rose-600">{error}</p> : null}
        </div>
      }
    />
  );
}
