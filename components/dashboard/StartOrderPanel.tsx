"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  CheckoutShell,
  VisamentOrderSummary,
  checkoutFieldClass,
  checkoutFieldErrorClass,
  checkoutLabelClass,
  isValidMobile10,
  sanitizeMobileDigits,
  type VisamentSummaryApplicant,
} from "@/components/checkout/CheckoutShell";
import { OTPInput } from "@/components/OTPInput";
import { SearchableDialCode } from "@/components/checkout/SearchableDialCode";
import {
  listCustomerApplications,
  requestApplicantEmailOtp,
  verifyApplicantEmailOtp,
  type CustomerApplicationSummary,
} from "@/lib/api";
import {
  dialCodeForCountryName,
  FALLBACK_DIAL_OPTIONS,
  fetchCountryDialOptions,
  pricingSlugFromCountryName,
  type CountryDialOption,
} from "@/lib/country-dial-codes";
import {
  fetchServicePrice,
  formatGbpAmount,
  setStoredPricingCountrySlug,
} from "@/lib/service-country-pricing";

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
  /** Live catalog `service_type` (e.g. e_oci). */
  serviceType?: string | null;
  /** Live catalog Service.pk — preferred when creating applications. */
  catalogId?: number | string | null;
};

export type StartOrderApplicant = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  /** E.164 dial prefix, e.g. "+44" */
  countryCode: string;
  applyingFrom: string;
  emailVerified?: boolean;
  emailVerificationToken?: string;
};

type StartOrderPanelProps = {
  services: StartOrderServiceOption[];
  selectedServiceId: string | null;
  showAllServicesInitially?: boolean;
  /** When false, hide the resume list (e.g. starting a new service from navbar). */
  showExistingApplications?: boolean;
  primaryApplicant: StartOrderApplicant;
  extraApplicants: StartOrderApplicant[];
  /** Logged-in account email — same-email applicants skip OTP. */
  accountEmail?: string;
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

const APPLYING_FROM_FALLBACK = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "India",
  "Ireland",
  "Singapore",
  "Germany",
  "France",
] as const;

function parsePrice(price: string, feeNumber: number | null): number {
  if (typeof feeNumber === "number" && Number.isFinite(feeNumber)) return feeNumber;
  const match = price.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "£0";
  return `£${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}

function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase() && Boolean(a.trim());
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function applicantNeedsEmailOtp(applicant: StartOrderApplicant, accountEmail?: string): boolean {
  const email = applicant.email.trim();
  if (!email || !isValidEmail(email)) return false;
  if (accountEmail && emailsMatch(email, accountEmail)) return false;
  return !(applicant.emailVerified && applicant.emailVerificationToken);
}

export function StartOrderPanel({
  services,
  selectedServiceId,
  showAllServicesInitially = false,
  showExistingApplications = true,
  primaryApplicant,
  extraApplicants,
  accountEmail,
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
  const [touched, setTouched] = useState({ name: false, email: false, mobile: false });
  const [otpTarget, setOtpTarget] = useState<{
    applicantId: string;
    email: string;
    fullName: string;
    mobile: string;
    isPrimary: boolean;
  } | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [existingApps, setExistingApps] = useState<CustomerApplicationSummary[]>([]);
  const [existingAppsLoading, setExistingAppsLoading] = useState(false);
  const [dialOptions, setDialOptions] = useState<CountryDialOption[]>(FALLBACK_DIAL_OPTIONS);
  const [dialOptionsLoading, setDialOptionsLoading] = useState(true);
  /** Country-resolved fees keyed by `${catalogId}:${countrySlug}` — driven by Applying From only. */
  const [countryFeeByKey, setCountryFeeByKey] = useState<Record<string, number>>({});

  const applyingFromOptions = useMemo(() => {
    const names = dialOptions
      .map((row) => row.country)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    if (names.length > 0) return names;
    return [...APPLYING_FROM_FALLBACK];
  }, [dialOptions]);

  useEffect(() => {
    let cancelled = false;
    setDialOptionsLoading(true);
    fetchCountryDialOptions()
      .then((rows) => {
        if (!cancelled && rows.length) setDialOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setDialOptions(FALLBACK_DIAL_OPTIONS);
      })
      .finally(() => {
        if (!cancelled) setDialOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live prices on this page only: when Applying From changes, refetch country fees.
  const applyingFromKey = useMemo(
    () => allApplicants.map((row) => row.applyingFrom || "").join("|"),
    [allApplicants],
  );
  const catalogIdsKey = useMemo(
    () =>
      services
        .map((row) => Number(row.catalogId) || 0)
        .filter((id) => id > 0)
        .join(","),
    [services],
  );

  useEffect(() => {
    const catalogServices = services.filter((row) => {
      const id = Number(row.catalogId);
      return Number.isFinite(id) && id > 0 && row.id !== "undecided";
    });
    if (!catalogServices.length) return;

    const slugs = new Set<string>();
    for (const name of applyingFromKey.split("|")) {
      const slug = pricingSlugFromCountryName(name);
      if (slug) slugs.add(slug);
    }
    if (!slugs.size) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        catalogServices.flatMap((service) => {
          const catalogId = Number(service.catalogId);
          return Array.from(slugs).map(async (slug) => {
            const key = `${catalogId}:${slug}`;
            const payload = await fetchServicePrice(catalogId, slug);
            const fee = Number(payload?.total_fee ?? payload?.service_fee);
            return { key, fee: Number.isFinite(fee) ? fee : null };
          });
        }),
      );
      if (cancelled) return;
      setCountryFeeByKey((current) => {
        const next = { ...current };
        for (const row of entries) {
          if (row.fee != null) next[row.key] = row.fee;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [applyingFromKey, catalogIdsKey, services]);

  const pricedService = useCallback(
    (service: StartOrderServiceOption, applyingFrom: string): StartOrderServiceOption => {
      const catalogId = Number(service.catalogId);
      const slug = pricingSlugFromCountryName(applyingFrom || "");
      if (!Number.isFinite(catalogId) || catalogId <= 0 || !slug) return service;
      const fee = countryFeeByKey[`${catalogId}:${slug}`];
      if (typeof fee !== "number" || !Number.isFinite(fee)) return service;
      return {
        ...service,
        feeNumber: fee,
        price: formatGbpAmount(fee),
      };
    },
    [countryFeeByKey],
  );

  useEffect(() => {
    if (!showExistingApplications) {
      setExistingApps([]);
      setExistingAppsLoading(false);
      return;
    }
    let cancelled = false;
    setExistingAppsLoading(true);
    listCustomerApplications()
      .then((rows) => {
        if (!cancelled) setExistingApps(rows.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setExistingApps([]);
      })
      .finally(() => {
        if (!cancelled) setExistingAppsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showExistingApplications]);

  const serviceGroups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; services: StartOrderServiceOption[]; rank: number }>();
    const rankFor = (key: string) => {
      const k = key.toLowerCase();
      if (k === "oci") return 0;
      if (k === "passport" || k.includes("passport")) return 1;
      if (k === "evisa" || k.includes("visa")) return 2;
      if (k === "apostille") return 3;
      if (k === "other" || k === "others") return 4;
      if (k === "pan_card" || k === "uncategorized") return 5;
      return 9;
    };
    for (const service of services) {
      if (service.id === "undecided") continue;
      const key = service.category || "other";
      const label =
        service.categoryName ||
        key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const existing = map.get(key);
      if (existing) existing.services.push(service);
      else map.set(key, { key, label, services: [service], rank: rankFor(key) });
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.label.localeCompare(b.label);
    });
  }, [services]);

  const resolveOptionId = (serviceKey: string | null | undefined): string | null => {
    if (!serviceKey) return null;
    const normalized = serviceKey.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const direct = services.find((s) => s.id === serviceKey);
    if (direct) return direct.id;
    // Prefer exact live catalog service_type so navbar/hero pick the right row.
    const byExactType = services.find((s) => {
      const type = String(s.serviceType || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      return type === normalized;
    });
    if (byExactType) return byExactType.id;
    const byJourneyExact = services.find((s) => s.journeyId === serviceKey);
    if (byJourneyExact) return byJourneyExact.id;
    const byTypeOrJourney = services.find((s) => {
      const journey = String(s.journeyId || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      const type = String(s.serviceType || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      const idNorm = String(s.id || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      const nameNorm = String(s.name || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
      return (
        journey === normalized ||
        type === normalized ||
        idNorm === normalized ||
        nameNorm === normalized ||
        nameNorm === `e_${normalized}` ||
        (normalized === "e_oci" && (type === "e_oci" || journey === "e_oci" || nameNorm.includes("e_oci")))
      );
    });
    if (byTypeOrJourney) return byTypeOrJourney.id;
    return serviceKey;
  };

  const isServiceSelected = (selectedIds: string[], serviceId: string): boolean => {
    if (selectedIds.includes(serviceId)) return true;
    const row = services.find((s) => s.id === serviceId);
    if (!row) return false;

    // Catalog rows (svc-<pk>) must only match their own id / serviceType — never another
    // row via a shared journeyId alias (e.g. spouse incorrectly looking like New OCI).
    const isCatalogRow = String(row.id).startsWith("svc-");
    const typeNorm = String(row.serviceType || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const typeHyphen = typeNorm.replace(/_/g, "-");

    return selectedIds.some((id) => {
      if (id === row.id) return true;
      const idNorm = String(id).trim().toLowerCase().replace(/[\s-]+/g, "_");
      const idHyphen = idNorm.replace(/_/g, "-");
      if (typeNorm && (idNorm === typeNorm || idHyphen === typeHyphen)) return true;
      if (isCatalogRow) return false;
      const journey = String(row.journeyId || "").trim();
      if (!journey) return false;
      return (
        id === journey ||
        id === journey.replace(/-/g, "_") ||
        id === journey.replace(/_/g, "-")
      );
    });
  };

  useEffect(() => {
    const optionId = resolveOptionId(selectedServiceId);
    if (!optionId || optionId === "undecided") return;
    setApplicantServices((current) => {
      const prev = current[primaryApplicant.id] || [];
      if (prev.includes(optionId) || isServiceSelected(prev, optionId)) {
        // Normalize aliases to the live option id.
        if (prev.includes(optionId)) return current;
        const cleaned = prev.filter((id) => id !== selectedServiceId && id !== String(selectedServiceId || "").replace(/-/g, "_"));
        return {
          ...current,
          [primaryApplicant.id]: [...cleaned, optionId],
        };
      }
      const withoutAlias = prev.filter(
        (id) =>
          id !== selectedServiceId &&
          id !== String(selectedServiceId || "").replace(/-/g, "_") &&
          id !== String(selectedServiceId || "").replace(/_/g, "-"),
      );
      return {
        ...current,
        [primaryApplicant.id]: [...withoutAlias, optionId],
      };
    });
  }, [selectedServiceId, primaryApplicant.id, services]);

  // Keep the category containing the preselected service expanded.
  useEffect(() => {
    const optionId = resolveOptionId(selectedServiceId);
    if (!optionId || !serviceGroups.length) return;
    const group = serviceGroups.find((g) => g.services.some((s) => s.id === optionId || isServiceSelected([optionId], s.id)));
    if (!group) return;
    const expandKey = `${primaryApplicant.id}:${group.key}`;
    setExpandedCategories((current) => {
      if (current[expandKey]) return current;
      return { ...current, [expandKey]: true };
    });
  }, [selectedServiceId, serviceGroups, primaryApplicant.id, services]);

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
    setExpandedCategories((current) => {
      const valid = new Set<string>();
      for (const applicant of allApplicants) {
        for (const group of serviceGroups) {
          valid.add(`${applicant.id}:${group.key}`);
        }
      }
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(current)) {
        if (!valid.has(key)) {
          changed = true;
          continue;
        }
        next[key] = value;
      }
      return changed ? next : current;
    });
  }, [serviceGroups, allApplicants]);

  const primarySelectedServices = applicantServices[primaryApplicant.id] || [];
  const currentServiceId = primarySelectedServices[0] || selectedServiceId || "";
  const onSelectServiceRef = useRef(onSelectService);
  onSelectServiceRef.current = onSelectService;

  useEffect(() => {
    if (!currentServiceId || currentServiceId === "undecided") return;
    const row = services.find((s) => s.id === currentServiceId);
    const journeyKey = String(row?.journeyId || currentServiceId).trim();
    if (!journeyKey) return;
    if (selectedServiceId === journeyKey || selectedServiceId === currentServiceId) return;
    onSelectServiceRef.current(journeyKey);
  }, [currentServiceId, selectedServiceId, services]);

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
        const priced = pricedService(row, applicant.applyingFrom);
        total += parsePrice(priced.price, priced.feeNumber);
      }
    }
    return total;
  }, [allApplicants, applicantServices, serviceById, pricedService]);

  const summaryApplicants: VisamentSummaryApplicant[] = useMemo(() => {
    return allApplicants.map((applicant, index) => {
      const selected = applicantServices[applicant.id] || [];
      const items = selected
        .map((serviceId) => {
          const row = serviceById.get(serviceId);
          if (!row) return null;
          const priced = pricedService(row, applicant.applyingFrom);
          return { id: `${applicant.id}-${serviceId}`, label: priced.name, amountLabel: priced.price };
        })
        .filter((row): row is { id: string; label: string; amountLabel: string } => Boolean(row));
      const subtotal = selected.reduce((sum, serviceId) => {
        const row = serviceById.get(serviceId);
        if (!row) return sum;
        const priced = pricedService(row, applicant.applyingFrom);
        return sum + parsePrice(priced.price, priced.feeNumber);
      }, 0);
      return {
        id: applicant.id,
        title: applicant.fullName.trim() || `Applicant ${index + 1}`,
        subtotalLabel: items.length ? formatMoney(subtotal) : "—",
        items,
      };
    });
  }, [allApplicants, applicantServices, serviceById, pricedService]);

  const toggleApplicantService = (applicantId: string, serviceId: string) => {
    setActiveApplicantId(applicantId);
    setApplicantServices((current) => {
      const prev = current[applicantId] || [];
      const exists = prev.includes(serviceId);
      const nextList = exists ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      return { ...current, [applicantId]: nextList };
    });
  };

  const patchEmailField = (isPrimary: boolean, applicantId: string, email: string) => {
    const sameAsAccount = Boolean(accountEmail && emailsMatch(email, accountEmail));
    const patch: Partial<StartOrderApplicant> = {
      email,
      emailVerified: sameAsAccount,
      emailVerificationToken: "",
    };
    if (isPrimary) onPrimaryChange(patch);
    else onUpdateApplicant(applicantId, patch);
  };

  const openOtpModal = async (applicant: StartOrderApplicant, isPrimary: boolean) => {
    const email = applicant.email.trim();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email before verifying.");
      return;
    }
    if (accountEmail && emailsMatch(email, accountEmail)) {
      const patch = { emailVerified: true, emailVerificationToken: "" };
      if (isPrimary) onPrimaryChange(patch);
      else onUpdateApplicant(applicant.id, patch);
      toast.success("This email matches your account.");
      return;
    }

    setOtpTarget({
      applicantId: applicant.id,
      email,
      fullName: applicant.fullName,
      mobile: applicant.mobile,
      isPrimary,
    });
    setOtpError(null);
    setOtpSent(false);
    setOtpSending(true);
    try {
      const result = await requestApplicantEmailOtp({
        email,
        fullName: applicant.fullName,
        mobile: applicant.mobile,
      });
      if (result.already_owned) {
        const patch = { emailVerified: true, emailVerificationToken: "" };
        if (isPrimary) onPrimaryChange(patch);
        else onUpdateApplicant(applicant.id, patch);
        setOtpTarget(null);
        toast.success("This email matches your account.");
        return;
      }
      setOtpSent(true);
      toast.success("Verification code sent to the applicant email.");
    } catch (err) {
      setOtpTarget(null);
      toast.error(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpComplete = useCallback(
    async (otp: string) => {
      if (!otpTarget || otpVerifying) return;
      setOtpVerifying(true);
      setOtpError(null);
      try {
        const result = await verifyApplicantEmailOtp({
          email: otpTarget.email,
          otp,
          fullName: otpTarget.fullName,
          mobile: otpTarget.mobile,
        });
        const patch: Partial<StartOrderApplicant> = {
          emailVerified: true,
          emailVerificationToken: result.verification_token || "",
        };
        if (otpTarget.isPrimary) onPrimaryChange(patch);
        else onUpdateApplicant(otpTarget.applicantId, patch);
        setOtpTarget(null);
        toast.success("Email verified.");
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : "Invalid OTP.");
      } finally {
        setOtpVerifying(false);
      }
    },
    [otpTarget, otpVerifying, onPrimaryChange, onUpdateApplicant],
  );

  const nameError = touched.name && !primaryApplicant.fullName.trim();
  const mobileError =
    touched.mobile &&
    (!primaryApplicant.mobile.trim() || !isValidMobile10(primaryApplicant.mobile));
  const emailError =
    touched.email &&
    (!primaryApplicant.email.trim() || !isValidEmail(primaryApplicant.email.trim()));

  const renderEmailStatus = (applicant: StartOrderApplicant, isPrimary: boolean) => {
    const email = applicant.email.trim();
    const sameAsAccount = Boolean(accountEmail && emailsMatch(email, accountEmail));
    const verified = Boolean(applicant.emailVerified) || sameAsAccount;
    const needsOtp = applicantNeedsEmailOtp(applicant, accountEmail);

    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {verified ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" strokeWidth={3} />
            {sameAsAccount ? "Your account email" : "Email verified"}
          </span>
        ) : email && isValidEmail(email) ? (
          <button
            type="button"
            disabled={apiLoading || otpSending}
            onClick={() => openOtpModal(applicant, isPrimary)}
            className="text-[12px] font-semibold text-[#1A56DB] hover:underline disabled:opacity-60"
          >
            {otpSending && otpTarget?.applicantId === applicant.id ? "Sending…" : "Verify email"}
          </button>
        ) : (
          <p className="text-[12px] text-[#829AB1]">We&apos;ll send a verification code to this email.</p>
        )}
        {needsOtp && email && isValidEmail(email) ? (
          <span className="text-[12px] font-medium text-amber-700">Verification required to continue</span>
        ) : null}
      </div>
    );
  };

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
          <p className="mt-1 text-[12px] font-medium text-[#E11D48]">Name is required</p>
        ) : null}
      </div>
      <div>
        <label className={checkoutLabelClass}>
          Mobile Number {opts.isPrimary ? <span className="text-[#E11D48]">*</span> : null}
        </label>
        <div className="flex gap-2">
          <SearchableDialCode
            value={applicant.countryCode || dialCodeForCountryName(applicant.applyingFrom, dialOptions)}
            options={dialOptions}
            loading={dialOptionsLoading}
            disabled={apiLoading}
            className={`${checkoutFieldClass} flex w-[118px] shrink-0 items-center justify-between gap-1 px-2 text-left`}
            onChange={(countryCode) => {
              if (opts.isPrimary) onPrimaryChange({ countryCode });
              else onUpdateApplicant(applicant.id, { countryCode });
            }}
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={applicant.mobile}
            disabled={apiLoading}
            placeholder="10-digit mobile number"
            className={`min-w-0 flex-1 ${checkoutFieldClass} ${
              opts.isPrimary && mobileError ? checkoutFieldErrorClass : ""
            }`}
            onBlur={() => {
              if (opts.isPrimary) setTouched((t) => ({ ...t, mobile: true }));
            }}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey || e.altKey) return;
              const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
              if (allowed.includes(e.key)) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const next = sanitizeMobileDigits(e.clipboardData.getData("text"), 10);
              if (opts.isPrimary) onPrimaryChange({ mobile: next });
              else onUpdateApplicant(applicant.id, { mobile: next });
            }}
            onChange={(e) => {
              const next = sanitizeMobileDigits(e.target.value, 10);
              if (opts.isPrimary) onPrimaryChange({ mobile: next });
              else onUpdateApplicant(applicant.id, { mobile: next });
            }}
          />
        </div>
        {opts.isPrimary && mobileError ? (
          <p className="mt-1 text-[12px] font-medium text-[#E11D48]">
            Enter a valid 10-digit mobile number
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-[#829AB1]">Digits only · exactly 10 numbers</p>
        )}
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
          onChange={(e) => patchEmailField(opts.isPrimary, applicant.id, e.target.value)}
        />
        {opts.isPrimary && emailError ? (
          <p className="mt-1 text-[12px] font-medium text-[#E11D48]">Valid email is required</p>
        ) : (
          renderEmailStatus(applicant, opts.isPrimary)
        )}
      </div>
      <div>
        <label className={checkoutLabelClass}>
          Applying From {opts.isPrimary ? <span className="text-[#E11D48]">*</span> : null}
        </label>
        <select
          value={applicant.applyingFrom}
          disabled={apiLoading || dialOptionsLoading}
          className={checkoutFieldClass}
          onChange={(e) => {
            const applyingFrom = e.target.value;
            const countryCode = dialCodeForCountryName(applyingFrom, dialOptions);
            const slug = pricingSlugFromCountryName(applyingFrom);
            if (slug) setStoredPricingCountrySlug(slug);
            if (opts.isPrimary) onPrimaryChange({ applyingFrom, countryCode });
            else onUpdateApplicant(applicant.id, { applyingFrom, countryCode });
          }}
        >
          {!applicant.applyingFrom ? (
            <option value="" disabled>
              Select country…
            </option>
          ) : null}
          {applyingFromOptions.map((option) => (
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
        <p className="text-[15px] font-semibold text-[#0F1F3D]">What documents do you need?</p>
        <p className="mt-0.5 text-[13px] text-[#829AB1]">
          All categories are listed below. Pick one or more services for this applicant.
        </p>

        <div className="mt-3 space-y-2">
          {serviceGroups.map((group) => {
            const expandKey = `${applicant.id}:${group.key}`;
            const open = Boolean(expandedCategories[expandKey]);
            const isSingle = group.services.length === 1;
            const pricedGroupServices = group.services.map((service) =>
              pricedService(service, applicant.applyingFrom),
            );

            if (isSingle) {
              const service = pricedGroupServices[0];
              const checked = isServiceSelected(selected, service.id);
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
                    <span className="truncate text-[14px] font-semibold text-[#0F1F3D]">{service.name}</span>
                  </span>
                  <span className="shrink-0 text-[14px] font-bold text-[#102A43]">{service.price}</span>
                </button>
              );
            }

            const groupSelectedCount = pricedGroupServices.filter((s) =>
              isServiceSelected(selected, s.id),
            ).length;
            return (
              <div
                key={`${applicant.id}-${group.key}`}
                className="overflow-hidden rounded-xl border border-[#D7E4F4] bg-white"
              >
                <button
                  type="button"
                  disabled={apiLoading}
                  onClick={() =>
                    setExpandedCategories((current) => ({
                      ...current,
                      [expandKey]: !current[expandKey],
                    }))
                  }
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#F8FAFC]"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-[#0F1F3D]">{group.label}</span>
                    <span className="mt-0.5 block text-[12px] text-[#829AB1]">
                      {pricedGroupServices.length} options
                      {groupSelectedCount > 0 ? ` · ${groupSelectedCount} selected` : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#829AB1] transition ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open ? (
                  <div className="space-y-1 border-t border-[#E8EEF5] px-2 py-2">
                    {pricedGroupServices.map((service) => {
                      const checked = isServiceSelected(selected, service.id);
                      return (
                        <button
                          key={`${applicant.id}-${service.id}`}
                          type="button"
                          disabled={apiLoading}
                          onClick={() => toggleApplicantService(applicant.id, service.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                            checked ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-[#1A56DB] bg-[#1A56DB] text-white"
                                  : "border-[#C7D4E8] bg-white"
                              }`}
                            >
                              {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-[#0F1F3D]">
                                {service.name}
                              </span>
                              {service.description ? (
                                <span className="mt-0.5 block truncate text-[11px] text-[#829AB1]">
                                  {service.description}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-[13px] font-bold text-[#102A43]">
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
    <>
      <CheckoutShell
        title="Start your order"
        subtitle="Select a service, then pay before uploading documents."
        currentStep={0}
        summary={
          <VisamentOrderSummary applicants={summaryApplicants} totalLabel={formatMoney(orderTotal)} />
        }
        form={
          <div className="space-y-5">
            {showExistingApplications && (existingAppsLoading || existingApps.length) ? (
              <div className="rounded-2xl border border-[#D7E4F4] bg-[#F8FBFF] p-4">
                <p className="text-[13px] font-semibold text-[#0F1F3D]">Your applications</p>
                <p className="mt-0.5 text-[11px] text-[#829AB1]">
                  Cases on your account — including ones you started for verified co-applicants.
                </p>
                {existingAppsLoading ? (
                  <p className="mt-2 text-[12px] text-[#829AB1]">Loading…</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {existingApps.map((app) => (
                      <li
                        key={app.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4EDF8] bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#0F1F3D]">
                            {app.service_name || app.service_type || "Application"}
                          </p>
                          <p className="truncate text-[11px] text-[#829AB1]">
                            {app.reference_number}
                            {app.customer_name ? ` · ${app.customer_name}` : ""}
                            {app.application_status ? ` · ${app.application_status}` : ""}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/document-audit?reference=${encodeURIComponent(app.reference_number)}&resume=1`}
                          className="shrink-0 text-[11px] font-semibold text-[#1A56DB] hover:underline"
                        >
                          Continue
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

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
                className="inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-[#1A56DB] hover:underline disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Add Applicant
              </button>

              <button
                type="button"
                disabled={apiLoading || primarySelectedServices.length === 0}
                onClick={() => {
                  setTouched({ name: true, email: true, mobile: true });
                  if (!primaryApplicant.fullName.trim() || !primaryApplicant.email.trim()) return;
                  if (!isValidMobile10(primaryApplicant.mobile)) {
                    toast.error("Enter a valid 10-digit mobile number.");
                    return;
                  }
                  const incomplete = extraApplicants.find(
                    (row) => !row.fullName.trim() || !row.email.trim(),
                  );
                  if (incomplete) return;
                  const badMobile = extraApplicants.find(
                    (row) => row.mobile.trim() && !isValidMobile10(row.mobile),
                  );
                  if (badMobile) {
                    toast.error("Each applicant mobile must be exactly 10 digits.");
                    return;
                  }
                  const withoutServices = allApplicants.find(
                    (row) => !(applicantServices[row.id] || []).length,
                  );
                  if (withoutServices) return;
                  const unverified = allApplicants.find((row) => applicantNeedsEmailOtp(row, accountEmail));
                  if (unverified) {
                    toast.error(`Verify ${unverified.email || "applicant email"} before continuing.`);
                    return;
                  }
                  onContinue(
                    allApplicants.map((applicant) => ({
                      applicant,
                      serviceIds: applicantServices[applicant.id] || [],
                    })),
                  );
                }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#1A56DB] px-10 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1648B5] disabled:cursor-not-allowed disabled:bg-[#C5D0DE] sm:w-auto sm:min-w-[200px]"
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

      {otpTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F1F3D]/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-semibold text-[#0F1F3D]">Verify applicant email</p>
                <p className="mt-1 text-[13px] text-[#829AB1]">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-[#0F1F3D]">{otpTarget.email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOtpTarget(null)}
                className="rounded-lg p-1 text-[#829AB1] hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <OTPInput onComplete={handleOtpComplete} error={Boolean(otpError)} />
            </div>
            {otpError ? <p className="mt-3 text-center text-[12px] font-medium text-[#E11D48]">{otpError}</p> : null}
            {otpVerifying ? <p className="mt-3 text-center text-[12px] text-[#829AB1]">Verifying…</p> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={otpSending}
                onClick={() =>
                  openOtpModal(
                    {
                      id: otpTarget.applicantId,
                      fullName: otpTarget.fullName,
                      email: otpTarget.email,
                      mobile: otpTarget.mobile,
                      countryCode: "+44",
                      applyingFrom: "United Kingdom",
                    },
                    otpTarget.isPrimary,
                  )
                }
                className="text-[12px] font-semibold text-[#1A56DB] hover:underline disabled:opacity-60"
              >
                {otpSending ? "Sending…" : otpSent ? "Resend code" : "Send code"}
              </button>
              <button
                type="button"
                onClick={() => setOtpTarget(null)}
                className="rounded-xl border border-[#D7E4F4] px-4 py-2 text-[13px] font-semibold text-[#0F1F3D]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
