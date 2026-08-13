"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowRight, Loader2, Plus, Shield, Sparkles, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { useEVisa } from "@/context/EVisaContext";
import { useAuth } from "@/context/AuthContext";
import {
  CheckoutShell,
  OrderSummaryCard,
  ServiceOptionList,
  checkoutFieldClass,
  checkoutFieldErrorClass,
  checkoutLabelClass,
  sanitizeMobileDigits,
} from "@/components/checkout/CheckoutShell";
import { eVisaApi } from "@/lib/api-client";
import { EVISA_DEFAULTS } from "@/lib/evisa-config";
import { authService } from "@/lib/auth";
import { authenticatedFetch, getPublicTestimonials, setTokens, submitTestimonial } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { dialCodeForCountryName, pricingSlugFromCountryName } from "@/lib/country-dial-codes";
import { fetchServicePrice, setStoredPricingCountrySlug } from "@/lib/service-country-pricing";

type ExtraApplicant = {
  id: string;
  fullName: string;
  countryCode: string;
  phone: string;
  email: string;
  applyingFrom: string;
};

type CountryVisaOption = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  feeNumber: number;
  duration: "1-Year" | "5-Year";
  serviceId: number;
  originOptionId: number | null;
};

type PublicOriginCountryRow = {
  id: number;
  name: string;
  slug: string;
};

type PublicVisaOptionRow = {
  id: number;
  service_id?: number;
  service_type?: string;
  service_name?: string;
  label?: string;
  fee?: string | number;
  duration?: string;
  entries?: string;
  validity?: string;
  travel_purpose?: string;
  is_active?: boolean;
};

function normalizeCountryKey(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripCitizenSuffix(value: string): string {
  return normalizeCountryKey(value)
    .replace(/\b(citizens?|nationals?|residents?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchOriginCountrySlug(
  applyingFrom: string,
  countries: PublicOriginCountryRow[],
): string | null {
  const key = normalizeCountryKey(applyingFrom);
  if (!key || !countries.length) return null;
  const keyCore = stripCitizenSuffix(key);

  const aliases: Record<string, string[]> = {
    "united kingdom": ["united kingdom", "uk", "great britain", "british"],
    "united states": ["united states", "usa", "us", "american"],
    "united arab emirates": ["united arab emirates", "uae", "emirates"],
    canada: ["canada", "canadian"],
    australia: ["australia", "australian"],
    malaysia: ["malaysia", "malaysian"],
    india: ["india", "indian"],
  };

  const exact = countries.find((row) => {
    const name = normalizeCountryKey(row.name);
    return name === key || stripCitizenSuffix(row.name) === keyCore;
  });
  if (exact) return exact.slug;

  for (const [canonical, keys] of Object.entries(aliases)) {
    if (!keys.includes(key) && !keys.includes(keyCore) && key !== canonical && keyCore !== canonical) {
      continue;
    }
    const hit = countries.find((row) => {
      const name = normalizeCountryKey(row.name);
      const nameCore = stripCitizenSuffix(row.name);
      const slug = normalizeCountryKey(row.slug);
      return (
        name === canonical ||
        nameCore === canonical ||
        keys.some(
          (alias) =>
            name === alias ||
            nameCore === alias ||
            name.includes(alias) ||
            nameCore.includes(alias) ||
            slug.includes(alias.replace(/\s+/g, "-")),
        )
      );
    });
    if (hit) return hit.slug;
  }

  const fuzzy = countries.find((row) => {
    const name = normalizeCountryKey(row.name);
    const nameCore = stripCitizenSuffix(row.name);
    return (
      name.includes(key) ||
      key.includes(name) ||
      nameCore.includes(keyCore) ||
      keyCore.includes(nameCore)
    );
  });
  return fuzzy?.slug || null;
}

function durationFromServiceType(serviceType: string, fallback?: string): "1-Year" | "5-Year" {
  const raw = String(fallback || serviceType || "").toLowerCase();
  if (raw.includes("5")) return "5-Year";
  return "1-Year";
}

function formatOptionDescription(row: PublicVisaOptionRow): string {
  const parts = [row.entries, row.validity, row.travel_purpose]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "Indian e-Visa";
}

const registrationSchema = z.object({
  visaDuration: z.enum(["1-Year", "5-Year"], { message: "Select visa duration" }),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  countryCode: z.string().trim().min(1, "Select country code"),
  phone: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name as per passport")
    .max(120, "Name is too long"),
  nationality: z.string().trim().min(1, "Select your nationality"),
  countryOfResidence: z.string().trim().min(1, "Select your country of residence"),
  purposeOfVisit: z.enum(["Tourism", "Business", "Medical", "Conference", "Other"], {
    message: "Select purpose of visit",
  }),
  consent: z.literal(true, { message: "You must agree to continue" }),
});

type RegistrationData = z.infer<typeof registrationSchema>;

type ExtraApplicantErrors = {
  fullName?: string;
  phone?: string;
  email?: string;
  applyingFrom?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeApplicantName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeApplyingFrom(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sameApplyingCountry(a: string, b: string): boolean {
  const left = normalizeApplyingFrom(a);
  const right = normalizeApplyingFrom(b);
  return Boolean(left) && left === right;
}

function samePersonSameVisaMessage(applicantName: string, country?: string): string {
  const name = applicantName.trim() || "This applicant";
  const from = country?.trim();
  if (from) {
    return `${name} is already added for this e-Visa from ${from}. The same person cannot apply twice for the same service from the same country.`;
  }
  return `${name} is already added for this e-Visa. The same person cannot apply twice for the same service.`;
}

function validateExtraApplicant(row: ExtraApplicant): ExtraApplicantErrors {
  const errors: ExtraApplicantErrors = {};
  const hasAny = Boolean(row.fullName.trim() || row.email.trim() || row.phone.trim() || row.applyingFrom.trim());
  if (!hasAny) return errors;

  if (!row.fullName.trim() || row.fullName.trim().length < 2) {
    errors.fullName = "Enter full name as per passport";
  }
  const digits = row.phone.replace(/\D/g, "");
  if (!row.phone.trim() || !/^\d{10}$/.test(digits)) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }
  if (!row.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(row.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (!row.applyingFrom.trim()) {
    errors.applyingFrom = "Select applying from country";
  }
  return errors;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const trustItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const REGISTER_DRAFT_SESSION_KEY = "flyoci:evisa-register-draft-active";

type CountryOption = {
  country: string;
  nationality: string;
  dialCode: string;
  flag: string;
  cca2: string;
};

type SearchableSelectFieldProps = {
  value?: string;
  options: readonly string[];
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  className: string;
  onChange: (value: string) => void;
};

function SearchableSelectField({
  value,
  options,
  placeholder,
  loading,
  disabled,
  className,
  onChange,
}: SearchableSelectFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(trimmedQuery));
  }, [options, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('[data-highlighted="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, filteredOptions]);

  const commitSelection = (selectedValue: string) => {
    onChange(selectedValue);
    setQuery(selectedValue);
    setIsOpen(false);
  };

  const showLoading = Boolean(loading && options.length === 0);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && filteredOptions[highlightedIndex]
            ? `country-option-${highlightedIndex}`
            : undefined
        }
        className={className}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setQuery(value || "");
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              return;
            }
            if (filteredOptions.length === 0) return;
            setHighlightedIndex((current) => (current + 1) % filteredOptions.length);
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              return;
            }
            if (filteredOptions.length === 0) return;
            setHighlightedIndex((current) =>
              current <= 0 ? filteredOptions.length - 1 : current - 1,
            );
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (!isOpen || filteredOptions.length === 0) return;
            const selected =
              filteredOptions[highlightedIndex] ||
              filteredOptions.find((option) => option.toLowerCase() === query.trim().toLowerCase()) ||
              filteredOptions[0];
            if (selected) {
              commitSelection(selected);
            }
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
            setQuery(value || "");
          }, 120);
        }}
      />

      {isOpen && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-[14px] border border-[#d9e4f7] bg-white shadow-[0_18px_40px_rgba(22,62,120,0.14)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {showLoading ? (
            <div className="px-3 py-2 text-[13px] text-[#7a8bab]">Loading...</div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const highlighted = index === highlightedIndex;
              return (
                <button
                  key={option}
                  id={`country-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  data-highlighted={highlighted ? "true" : undefined}
                  className={`block w-full px-3 py-2 text-left text-[13px] transition-colors ${
                    highlighted
                      ? "bg-[#edf3ff] text-[#0F1F3D]"
                      : "text-[#1d2f4f] hover:bg-[#edf3ff]"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => commitSelection(option)}
                >
                  {option}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[13px] text-[#7a8bab]">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

type SearchableDialCodeProps = {
  value?: string;
  options: readonly CountryOption[];
  loading?: boolean;
  disabled?: boolean;
  className: string;
  onChange: (value: string) => void;
};

function SearchableDialCode({
  value,
  options,
  loading,
  disabled,
  className,
  onChange,
}: SearchableDialCodeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.dialCode === value) || null,
    [options, value],
  );

  useEffect(() => {
    setQuery("");
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.flag} ${option.dialCode} ${option.country} ${option.cca2}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [options, query]);

  const commitSelection = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setQuery("");
  };

  const showLoading = Boolean(loading && options.length === 0);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
      >
        <span className="truncate">
          {selectedOption ? `${selectedOption.flag} ${selectedOption.dialCode}` : "Select code"}
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[14px] border border-[#d9e4f7] bg-white shadow-[0_18px_40px_rgba(22,62,120,0.14)]">
          <input
            type="text"
            value={query}
            placeholder="Search country or code"
            autoComplete="off"
            className="w-full border-0 border-b border-[#edf2fb] px-3 py-2 text-[13px] outline-none"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="max-h-60 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {showLoading ? (
              <div className="px-3 py-2 text-[13px] text-[#7a8bab]">Loading...</div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.cca2 || option.dialCode}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] text-[#1d2f4f] transition-colors hover:bg-[#edf3ff]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSelection(option.dialCode)}
                >
                  {option.flag} {option.dialCode} {option.country}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-[13px] text-[#7a8bab]">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function dedupeAndSortOptions(options: string[]): string[] {
  return Array.from(new Set(options.filter((value) => Boolean(value && value.trim())))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function appendOtherOption(options: string[]): string[] {
  const filtered = options.filter((value) => value !== "Other");
  return [...filtered, "Other"];
}

function getDefaultDialCode(options: CountryOption[]): string {
  return options.find((option) => option.country === "United Kingdom")?.dialCode || options[0]?.dialCode || "";
}

function flagFromCountryCode(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  if (code.length !== 2) {
    return "";
  }
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function extractCountryOptions(data: Array<{
  name?: { common?: string };
  demonyms?: { eng?: { m?: string; f?: string } };
  idd?: { root?: string; suffixes?: string[] };
  flag?: string;
  cca2?: string;
}>): CountryOption[] {
  return data
    .filter((country) => Boolean(country.idd?.root))
    .map((country) => ({
      country: country.name?.common?.trim() || "",
      nationality: (country.demonyms?.eng?.m || country.demonyms?.eng?.f || country.name?.common || "").trim(),
      dialCode: `${country.idd?.root || ""}${country.idd?.suffixes?.length === 1 ? country.idd.suffixes[0] : ""}`.trim(),
      flag: country.flag || flagFromCountryCode(country.cca2 || ""),
      cca2: country.cca2 || "",
    }))
    .filter((entry) => Boolean(entry.country && entry.dialCode))
    .sort((left, right) => left.country.localeCompare(right.country));
}

// restcountries.com v3.x is deprecated (301 -> legacy.json error). Use world-countries CDN instead.
const countriesApiUrl = "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json";

function splitPhoneNumber(combined: string, dialCodes: string[] = [], fallbackCountryCode = ""): {
  countryCode: string;
  phone: string;
} {
  if (!combined || !combined.trim()) {
    return { countryCode: fallbackCountryCode, phone: "" };
  }

  const codes = Array.from(new Set(dialCodes.filter((code) => Boolean(code && code.trim()))))
    .sort((left, right) => right.length - left.length);

  const cleaned = combined.trim();

  for (const code of codes) {
    if (cleaned.startsWith(code)) {
      return {
        countryCode: code,
        phone: cleaned.slice(code.length).trim(),
      };
    }
  }

  // Fallback if no known code found
  return { countryCode: fallbackCountryCode || codes[0] || "", phone: cleaned };
}

export default function RegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateData, resetData } = useEVisa();
  const originOptionIdRef = useRef<number | null>(null);
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [extraApplicants, setExtraApplicants] = useState<ExtraApplicant[]>([]);
  const [extraApplicantErrors, setExtraApplicantErrors] = useState<Record<string, ExtraApplicantErrors>>({});
  const [emailAutofilled, setEmailAutofilled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const [hasActiveDraftSession, setHasActiveDraftSession] = useState(false);
  const [draftSessionChecked, setDraftSessionChecked] = useState(false);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [isCountryOptionsLoading, setIsCountryOptionsLoading] = useState(true);
  const [resumeApplication, setResumeApplication] = useState<{
    case_number: string;
    application_status: string;
    current_stage: string;
    service_name: string;
    application_date: string | null;
    created_at: string;
    updated_at: string;
    email_confirmed: boolean;
    payment_confirmed: boolean;
    consent_captured: boolean;
  } | null>(null);
  const [applicationRecord, setApplicationRecord] = useState<{
    reference_number?: string;
    application_status?: string;
    unified_status?: string;
    stage?: string;
    kanban_stage?: string | null;
    current_stage?: string;
    application_date?: string | null;
    submission_date?: string | null;
    approval_date?: string | null;
    completion_date?: string | null;
    created_at?: string;
    updated_at?: string;
    notes?: string;
    audit_logs?: Array<{
      action?: string;
      timestamp?: string;
      actor?: string;
      metadata?: {
        subject?: string;
        description?: string;
        message?: string;
        notes?: string;
      };
    }>;
    admin_messages?: Array<{
      created_at?: string;
      subject?: string;
      message?: string;
    }>;
    reupload_requests?: Array<{
      created_at?: string;
      note?: string;
      flagged_documents?: Array<{
        document_type?: string;
        document_name?: string;
        issue_reason?: string;
        required_action?: string;
      }>;
    }>;
    service_name?: string;
    audit_result?: "pending" | "green" | "amber" | "red" | string;
    auditor_notes?: string;
    correction_requested_at?: string | null;
    flagged_documents?: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      issue?: string;
      required_action?: string;
      status?: string;
    }>;
    latest_audit_findings?: Array<{
      id?: number;
      document_type?: string;
      document_name?: string;
      finding_description?: string;
      required_action?: string;
      priority?: string;
    }>;
  } | null>(null);
  const [documents, setDocuments] = useState<Array<{
    id: number;
    document_type: string;
    document_name?: string;
    original_filename?: string;
    stored_filename?: string;
    verification_status: string;
    upload_date: string | null;
    created_at?: string;
    updated_at: string;
  }>>([]);
  const [reuploadingDocumentKey, setReuploadingDocumentKey] = useState("");
  const [reuploadConfirmationMessage, setReuploadConfirmationMessage] = useState("");
  const [reviewAuthorName, setReviewAuthorName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const loadedResumeCaseRef = useRef("");
  const processedResumeMagicRef = useRef("");
  const initializedCleanStateRef = useRef(false);
  const lastSavedDetailsRef = useRef("");
  const magicToken = (searchParams.get("magic") || "").trim();
  const caseFromQuery = (searchParams.get("case") || "").trim().toUpperCase();
  const resumeMode = searchParams.get("resume") === "1";
  const detailsMode = searchParams.get("view") === "details";
  const isExistingCase = Boolean(caseFromQuery);
  const isReadOnlyApplication = searchParams.get("readonly") === "1";
  const originSlugFromQuery = (searchParams.get("origin") || "").trim();
  const optionFromQuery = Number(searchParams.get("option") || "");
  const durationFromQuery = (searchParams.get("duration") || "").trim();
  const countryFromQuery = (searchParams.get("country") || "").trim().toLowerCase();

  // Fresh "start e-Visa" visits use the same Start Order UI as OCI / other services.
  useEffect(() => {
    const keepLegacyFlow = Boolean(
      magicToken ||
        caseFromQuery ||
        resumeMode ||
        detailsMode ||
        originSlugFromQuery ||
        countryFromQuery ||
        (Number.isFinite(optionFromQuery) && optionFromQuery > 0) ||
        durationFromQuery,
    );
    if (keepLegacyFlow) return;
    router.replace("/dashboard/document-audit?start=1&service=evisa_1year");
  }, [
    magicToken,
    caseFromQuery,
    resumeMode,
    detailsMode,
    originSlugFromQuery,
    countryFromQuery,
    optionFromQuery,
    durationFromQuery,
    router,
  ]);

  const shouldHydrateFromPersistedState = Boolean(magicToken || caseFromQuery || resumeMode || detailsMode || hasActiveDraftSession);
  const nationalityOptions = useMemo(
    () => appendOtherOption(dedupeAndSortOptions(countryOptions.map((option) => option.nationality || option.country))),
    [countryOptions],
  );
  const residenceOptions = useMemo(
    () => appendOtherOption(dedupeAndSortOptions(countryOptions.map((option) => option.country))),
    [countryOptions],
  );
  const defaultDialCode = useMemo(() => getDefaultDialCode(countryOptions), [countryOptions]);
  const purposeOptions = new Set(["Tourism", "Business", "Medical", "Conference", "Other"]);

  useEffect(() => {
    let cancelled = false;

    const loadCountryOptions = async () => {
      try {
        setIsCountryOptionsLoading(true);
        const response = await fetch(countriesApiUrl);
        if (!response.ok) {
          throw new Error(`Country list request failed (${response.status})`);
        }
        const payload = await response.json().catch(() => []);

        if (cancelled) {
          return;
        }

        setCountryOptions(Array.isArray(payload) ? extractCountryOptions(payload) : []);
      } catch {
        if (!cancelled) {
          setCountryOptions([]);
        }
      } finally {
        if (!cancelled) {
          setIsCountryOptionsLoading(false);
        }
      }
    };

    void loadCountryOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const { register, handleSubmit, control, setValue, watch, reset, resetField, formState: { errors } } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      visaDuration: shouldHydrateFromPersistedState ? data.visaDuration || "1-Year" : "1-Year",
      email: shouldHydrateFromPersistedState ? data.email || "" : "",
      countryCode: shouldHydrateFromPersistedState ? data.countryCode || defaultDialCode : defaultDialCode,
      phone: shouldHydrateFromPersistedState ? data.phone || "" : "",
      fullName: shouldHydrateFromPersistedState ? data.fullName || "" : "",
      nationality: shouldHydrateFromPersistedState ? data.nationality || "" : "",
      countryOfResidence: shouldHydrateFromPersistedState ? data.countryOfResidence || "" : "",
      purposeOfVisit:
        shouldHydrateFromPersistedState && data.purposeOfVisit && purposeOptions.has(data.purposeOfVisit)
          ? (data.purposeOfVisit as RegistrationData["purposeOfVisit"])
          : "Tourism",
      consent: shouldHydrateFromPersistedState && data.consentAccepted ? true : undefined,
    }
  });

  useEffect(() => {
    const optionId = Number.isFinite(optionFromQuery) && optionFromQuery > 0 ? optionFromQuery : null;
    const duration =
      durationFromQuery === "5-Year" || durationFromQuery === "1-Year"
        ? durationFromQuery
        : null;
    if (!optionId && !originSlugFromQuery && !duration && !countryFromQuery) return;
    originOptionIdRef.current = optionId;
    if (countryFromQuery) {
      setStoredPricingCountrySlug(countryFromQuery);
    }
    updateData({
      ...(optionId ? { originOptionId: optionId } : {}),
      ...(originSlugFromQuery ? { originSlug: originSlugFromQuery } : {}),
      ...(duration ? { visaDuration: duration } : {}),
    });
    if (duration) {
      setValue("visaDuration", duration);
    }
  }, [optionFromQuery, originSlugFromQuery, durationFromQuery, countryFromQuery, updateData, setValue]);

  const selectedVisaDuration = watch("visaDuration") || "1-Year";
  const watchedApplyingFrom = watch("countryOfResidence") || "";
  const [countryVisaOptions, setCountryVisaOptions] = useState<CountryVisaOption[]>([]);
  const [countryVisaOptionsLoading, setCountryVisaOptionsLoading] = useState(false);
  const [selectedVisaOptionId, setSelectedVisaOptionId] = useState<string>("");
  const originCountriesCacheRef = useRef<PublicOriginCountryRow[] | null>(null);

  useEffect(() => {
    const applyingFrom = String(watchedApplyingFrom || "").trim();
    const pricingSlug =
      countryFromQuery ||
      pricingSlugFromCountryName(applyingFrom) ||
      "";

    if (pricingSlug) {
      setStoredPricingCountrySlug(pricingSlug);
    }

    if (!applyingFrom && !originSlugFromQuery) {
      setCountryVisaOptions([]);
      setCountryVisaOptionsLoading(false);
      return;
    }

    let cancelled = false;
    setCountryVisaOptionsLoading(true);

    (async () => {
      try {
        if (!originCountriesCacheRef.current) {
          const listRes = await fetch(`${API_BASE_URL}/public/origin-countries/`, { method: "GET" });
          if (!listRes.ok) throw new Error("Failed to load origin countries");
          const listRaw = await listRes.json();
          const rows = listRaw?.data?.countries || listRaw?.countries || [];
          originCountriesCacheRef.current = Array.isArray(rows)
            ? rows.map((row: { id?: number; name?: string; slug?: string }) => ({
                id: Number(row.id) || 0,
                name: String(row.name || ""),
                slug: String(row.slug || ""),
              }))
            : [];
        }

        const matchedSlug =
          originSlugFromQuery ||
          matchOriginCountrySlug(applyingFrom, originCountriesCacheRef.current || []);

        let mapped: CountryVisaOption[] = [];

        if (matchedSlug) {
          const detailRes = await fetch(
            `${API_BASE_URL}/public/origin-countries/${encodeURIComponent(matchedSlug)}/`,
            { method: "GET" },
          );
          if (detailRes.ok) {
            const detailRaw = await detailRes.json();
            const country = detailRaw?.data?.country || detailRaw?.country || detailRaw?.data || {};
            const options = Array.isArray(country?.visa_options) ? country.visa_options : [];
            mapped = options
              .filter((row: PublicVisaOptionRow) => row.is_active !== false)
              .map((row: PublicVisaOptionRow) => {
                const fee = Number(row.fee);
                const duration = durationFromServiceType(String(row.service_type || ""), String(row.duration || ""));
                return {
                  id: `origin-${row.id}`,
                  title: String(row.label || row.service_name || `${duration} Indian e-Visa`),
                  description: formatOptionDescription(row),
                  priceLabel: Number.isFinite(fee) ? `£${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(2)}` : "—",
                  feeNumber: Number.isFinite(fee) ? fee : 0,
                  duration,
                  serviceId: Number(row.service_id) || 0,
                  originOptionId: Number(row.id) || null,
                } satisfies CountryVisaOption;
              })
              .filter((row: CountryVisaOption) => Boolean(row.title));

            // Prefill Applying From when arriving from a country landing page.
            if (!applyingFrom && matchedSlug && residenceOptions.length) {
              const originName = String(country?.name || "").trim();
              const matchName =
                residenceOptions.find((option) => normalizeCountryKey(option) === normalizeCountryKey(originName)) ||
                residenceOptions.find((option) => {
                  const left = stripCitizenSuffix(option);
                  const right = stripCitizenSuffix(originName);
                  return left === right || left.includes(right) || right.includes(left);
                });
              if (matchName) {
                setValue("countryOfResidence", matchName, { shouldDirty: true, shouldValidate: true });
                updateData({ countryOfResidence: matchName });
              }
            }
          }
        }

        // Fallback only when this Applying From has no origin-country options configured.
        if (!mapped.length && applyingFrom) {
          const listRes = await fetch(`${API_BASE_URL}/services/`, { method: "GET" });
          if (listRes.ok) {
            const raw = await listRes.json();
            const list = raw?.data || raw;
            const rows = Array.isArray(list) ? list : list?.services || [];
            const evisaRows = rows.filter((row: { service_type?: string; is_active?: boolean }) => {
              const type = String(row.service_type || "").toLowerCase();
              return type.startsWith("evisa") && row.is_active !== false;
            });
            mapped = await Promise.all(
              evisaRows.map(async (row: { id?: number; service_type?: string; service_name?: string; base_fee?: string | number }) => {
                const serviceId = Number(row.id) || 0;
                const duration = durationFromServiceType(String(row.service_type || ""));
                let fee = Number(row.base_fee);
                if (serviceId && pricingSlug) {
                  const price = await fetchServicePrice(serviceId, pricingSlug);
                  const resolved = Number(price?.total_fee ?? price?.service_fee);
                  if (Number.isFinite(resolved)) fee = resolved;
                }
                return {
                  id: `service-${serviceId || duration}`,
                  title: String(row.service_name || `${duration} Indian Tourist e-Visa`),
                  description: duration === "5-Year" ? "Longer validity · Tourism" : "Multiple entry · Tourism",
                  priceLabel: Number.isFinite(fee) ? `£${fee % 1 === 0 ? fee.toFixed(0) : fee.toFixed(2)}` : "—",
                  feeNumber: Number.isFinite(fee) ? fee : 0,
                  duration,
                  serviceId,
                  originOptionId: null,
                } satisfies CountryVisaOption;
              }),
            );
          }
        }

        if (cancelled) return;
        setCountryVisaOptions(mapped);

        const preferred =
          mapped.find((row) => row.originOptionId && row.originOptionId === optionFromQuery) ||
          mapped.find((row) => row.duration === selectedVisaDuration) ||
          mapped[0] ||
          null;

        if (preferred) {
          setSelectedVisaOptionId(preferred.id);
          setValue("visaDuration", preferred.duration, { shouldValidate: true, shouldDirty: true });
          if (preferred.originOptionId) {
            originOptionIdRef.current = preferred.originOptionId;
          }
          updateData({
            visaDuration: preferred.duration,
            ...(preferred.originOptionId ? { originOptionId: preferred.originOptionId } : {}),
            ...(matchedSlug ? { originSlug: matchedSlug } : {}),
          });
        } else {
          setSelectedVisaOptionId("");
        }
      } catch {
        if (!cancelled) {
          setCountryVisaOptions([]);
          setSelectedVisaOptionId("");
        }
      } finally {
        if (!cancelled) setCountryVisaOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when country / query origin changes
  }, [
    watchedApplyingFrom,
    originSlugFromQuery,
    countryFromQuery,
    optionFromQuery,
    residenceOptions,
    setValue,
    updateData,
  ]);

  const selectedVisaOption =
    countryVisaOptions.find((row) => row.id === selectedVisaOptionId) ||
    countryVisaOptions.find((row) => row.duration === selectedVisaDuration) ||
    null;

  const selectedFeePounds =
    selectedVisaOption && Number.isFinite(selectedVisaOption.feeNumber)
      ? selectedVisaOption.feeNumber
      : 0;
  const selectedFeeLabel =
    selectedFeePounds > 0
      ? `£${selectedFeePounds % 1 === 0 ? selectedFeePounds.toFixed(0) : selectedFeePounds.toFixed(2)}`
      : "—";
  const selectedServiceLabel = selectedVisaOption?.title || "Select a visa option";
  const watchedFullName = watch("fullName") || "";
  const watchedEmail = watch("email") || "";
  const applicantCount = 1 + extraApplicants.length;
  const orderTotalValue = selectedFeePounds * applicantCount;
  const orderTotalLabel =
    orderTotalValue > 0
      ? `£${orderTotalValue % 1 === 0 ? orderTotalValue.toFixed(0) : orderTotalValue.toFixed(2)}`
      : "—";
  const phoneValue = watch("phone");
  const didAutoStripRef = useRef(false);
  const canContinueWithVisa =
    Boolean(watchedApplyingFrom) &&
    !countryVisaOptionsLoading &&
    countryVisaOptions.length > 0 &&
    Boolean(selectedVisaOption);

  // Autofill registered account email (and name when blank)
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    if (caseFromQuery || magicToken || resumeMode || detailsMode) return;

    const currentEmail = (watch("email") || "").trim();
    if (!currentEmail) {
      setValue("email", user.email, { shouldDirty: false, shouldValidate: true });
      setEmailAutofilled(true);
      updateData({ email: user.email });
    } else if (currentEmail.toLowerCase() === user.email.toLowerCase()) {
      setEmailAutofilled(true);
    }

    const currentName = (watch("fullName") || "").trim();
    if (!currentName) {
      const fullName = [user.first_name || "", user.last_name || ""].filter(Boolean).join(" ").trim();
      if (fullName) {
        setValue("fullName", fullName, { shouldDirty: false, shouldValidate: true });
        updateData({ fullName });
      }
    }
  }, [
    isAuthenticated,
    user?.email,
    user?.first_name,
    user?.last_name,
    caseFromQuery,
    magicToken,
    resumeMode,
    detailsMode,
    setValue,
    watch,
    updateData,
  ]);

  const addExtraApplicant = () => {
    setExtraApplicants((prev) => [
      ...prev,
      {
        id: `applicant-${Date.now()}-${prev.length + 2}`,
        fullName: "",
        countryCode: watch("countryCode") || defaultDialCode,
        phone: "",
        email: "",
        applyingFrom: watch("countryOfResidence") || "",
      },
    ]);
  };

  const updateExtraApplicant = (id: string, patch: Partial<ExtraApplicant>) => {
    setExtraApplicants((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        setExtraApplicantErrors((current) => {
          if (!current[id]) return current;
          const nextErrors = validateExtraApplicant(next);
          const copy = { ...current };
          if (Object.keys(nextErrors).length === 0) {
            delete copy[id];
          } else {
            copy[id] = nextErrors;
          }
          return copy;
        });
        return next;
      }),
    );
  };

  const removeExtraApplicant = (id: string) => {
    setExtraApplicants((prev) => prev.filter((row) => row.id !== id));
    setExtraApplicantErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  useEffect(() => {
    if (!phoneValue?.startsWith("+")) {
      didAutoStripRef.current = false;
      return;
    }

    if (didAutoStripRef.current) return;
    if (countryOptions.length === 0) return;

    const spaceIdx = phoneValue.indexOf(" ");
    if (spaceIdx === -1) return;

    const typedCode = phoneValue.slice(0, spaceIdx);
    const afterSpace = phoneValue.slice(spaceIdx + 1);

    const matched = countryOptions.find((country) => country.dialCode === typedCode);
    if (!matched) return;

    didAutoStripRef.current = true;

    if (watch("countryCode") !== matched.dialCode) {
      setValue("countryCode", matched.dialCode, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    setValue("phone", afterSpace, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [phoneValue, countryOptions]);

  useEffect(() => {
    if (!defaultDialCode || countryOptions.length === 0) {
      return;
    }

    const currentCountryCode = watch("countryCode");
    if (!currentCountryCode) {
      setValue("countryCode", defaultDialCode, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
    }
  }, [countryOptions, defaultDialCode, setValue, watch]);

 useEffect(() => {
  if (typeof window === "undefined") return;
  const hasDraft = sessionStorage.getItem(REGISTER_DRAFT_SESSION_KEY) === "1";
  setHasActiveDraftSession(hasDraft);
  setDraftSessionChecked(true);
}, []);

  useEffect(() => {
    if (!draftSessionChecked) {
      return;
    }

    // Fresh registration should start blank unless this tab has an active draft session.
    if (shouldHydrateFromPersistedState) {
      initializedCleanStateRef.current = false;
      return;
    }
    if (initializedCleanStateRef.current) {
      return;
    }

    initializedCleanStateRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(REGISTER_DRAFT_SESSION_KEY);
    }

    resetData();
    reset({
      visaDuration: undefined,
      email: "",
      countryCode: defaultDialCode,
      phone: "",
      fullName: "",
      nationality: undefined,
      countryOfResidence: undefined,
      purposeOfVisit: undefined,
      consent: undefined,
    });
    loadedResumeCaseRef.current = "";
    processedResumeMagicRef.current = "";

    // Profile prefill runs AFTER reset so it never gets wiped
    if (!isAuthenticated || !user?.email) return;

    setValue("email", user.email, { shouldDirty: false, shouldValidate: true });
    setEmailAutofilled(true);
    updateData({ email: user.email });

    const fullName = [user.first_name || "", user.last_name || ""].filter(Boolean).join(" ").trim();
    if (fullName) {
      setValue("fullName", fullName, { shouldDirty: false, shouldValidate: true });
      updateData({ fullName });
    }
  }, [draftSessionChecked, shouldHydrateFromPersistedState, resetData, reset, isAuthenticated, user, setValue, updateData]);

  useEffect(() => {
    if (!hasActiveDraftSession || caseFromQuery || magicToken || resumeMode || detailsMode) {
      return;
    }

    const nationality = data.nationality || undefined;
    const countryOfResidence = data.countryOfResidence || undefined;
    const purposeOfVisit = purposeOptions.has(data.purposeOfVisit || "") ? (data.purposeOfVisit as RegistrationData["purposeOfVisit"]) : undefined;

    reset({
      visaDuration: data.visaDuration || undefined,
      email: data.email || "",
      countryCode: data.countryCode || defaultDialCode,
      phone: data.phone || "",
      fullName: data.fullName || "",
      nationality,
      countryOfResidence,
      purposeOfVisit,
      consent: data.consentAccepted ? true : undefined,
    });
  }, [hasActiveDraftSession, caseFromQuery, magicToken, resumeMode, detailsMode, data, reset]);

  const applyRegistrationPrefill = (caseNumber: string, prefill?: {
    visaDuration?: "1-Year" | "5-Year";
    email?: string;
    countryCode?: string;
    phone?: string;
    phone_number?: string;
    fullName?: string;
    nationality?: string;
    countryOfResidence?: string;
    purposeOfVisit?: "Tourism" | "Business" | "Medical" | "Conference" | "Other" | "";
    consent?: boolean;
    minimalPrefillOnly?: boolean;
  }) => {
    if (prefill?.minimalPrefillOnly) {
      const visaDuration = prefill?.visaDuration === "5-Year" ? "5-Year" : "1-Year";
      const email = prefill?.email || "";
      const fullName = prefill?.fullName || "";

      setValue("visaDuration", visaDuration);
      setValue("email", email);
      setValue("countryCode", defaultDialCode);
      setValue("phone", "");
      setValue("fullName", fullName);
      resetField("nationality");
      resetField("countryOfResidence");
      resetField("purposeOfVisit");
      resetField("consent");

      updateData({
        fileNumber: caseNumber || null,
        visaDuration,
        email,
        phone: "",
        countryCode: defaultDialCode,
        fullName,
        nationality: "",
        countryOfResidence: "",
        purposeOfVisit: "",
        consentAccepted: false,
        isEmailConfirmed: false,
        hasPaid: false,
        hasUploaded: false,
      });
      return;
    }

    const visaDuration = prefill?.visaDuration === "5-Year" ? "5-Year" : "1-Year";
    const nationality = prefill?.nationality || undefined;
    const countryOfResidence = prefill?.countryOfResidence || undefined;
    const purposeOfVisit = purposeOptions.has(prefill?.purposeOfVisit || "") ? (prefill?.purposeOfVisit as RegistrationData["purposeOfVisit"]) : "Tourism";
    const rawCombined = (prefill as any)?.phone_number || "";
    const splitCombined = rawCombined && !prefill?.phone ? splitPhoneNumber(rawCombined, countryOptions.map((option) => option.dialCode), defaultDialCode) : null;
    const resolvedCountryCode = rawCombined && !prefill?.phone
      ? splitCombined?.countryCode || defaultDialCode
      : (prefill?.countryCode || watch("countryCode") || data.countryCode || defaultDialCode);
    const resolvedPhone = rawCombined && !prefill?.phone
      ? splitCombined?.phone || ""
      : ((prefill?.phone && prefill.phone.trim()) || watch("phone") || data.phone || "");

    console.log("[applyRegistrationPrefill] prefill data:", prefill);
    console.log("[applyRegistrationPrefill] parsed values:", { visaDuration, nationality, countryOfResidence, purposeOfVisit });
    if (rawCombined) {
      const split = splitPhoneNumber(rawCombined, countryOptions.map((option) => option.dialCode), defaultDialCode);
      console.log("[applyRegistrationPrefill] rawCombined phone:", rawCombined, "split:", split);
    }

    setValue("visaDuration", visaDuration);
    setValue("email", prefill?.email || "");
    setValue("countryCode", resolvedCountryCode, { shouldValidate: true, shouldDirty: true });
    setValue("phone", resolvedPhone, { shouldValidate: true, shouldDirty: true });
    setValue("fullName", prefill?.fullName || "");
    if (nationality) {
      setValue("nationality", nationality);
    }
    if (countryOfResidence) {
      setValue("countryOfResidence", countryOfResidence);
    }
    setValue("purposeOfVisit", purposeOfVisit);
    if (prefill?.consent) {
      setValue("consent", true);
    }

    updateData({
      fileNumber: caseNumber || null,
      visaDuration,
      email: prefill?.email || "",
      phone: resolvedPhone,
      countryCode: resolvedCountryCode,
      fullName: prefill?.fullName || "",
      nationality: nationality || "",
      countryOfResidence: countryOfResidence || "",
      purposeOfVisit,
      consentAccepted: Boolean(prefill?.consent),
      isEmailConfirmed: false,
      hasPaid: false,
      hasUploaded: false,
    });

    if (detailsMode) {
      lastSavedDetailsRef.current = JSON.stringify({
        case_number: caseNumber || "",
        email: prefill?.email || "",
        confirm_email: prefill?.email || "",
        mobile_number: `${resolvedCountryCode}${resolvedPhone}`,
        full_name: prefill?.fullName || "",
        nationality: nationality || "",
        country_of_residence: countryOfResidence || "",
        purpose_of_visit: purposeOfVisit,
        visa_duration: visaDuration,
        consent: true,
      });
    }
  };

  useEffect(() => {
    if (!magicToken) {
      return;
    }

    if (processedResumeMagicRef.current === magicToken) {
      return;
    }
    processedResumeMagicRef.current = magicToken;

    const verifyAndResume = async () => {
      try {
        const verifyRes = await authService.verifyMagicLink(magicToken);
        const caseFromMagic = (verifyRes.data.case_number || caseFromQuery || "").trim().toUpperCase();
        const resumeUrl = verifyRes.data.resume_url || (caseFromMagic ? `/indian-e-visa?case=${encodeURIComponent(caseFromMagic)}` : "/indian-e-visa");

        if (!caseFromMagic) {
          router.replace(resumeUrl);
          return;
        }

        const response = await eVisaApi.getResume(caseFromMagic);
        setResumeApplication(response.data.application_data || null);
        if (response.data.next_step === "registration") {
          applyRegistrationPrefill(caseFromMagic, response.data.registration_prefill);
          router.replace(`/indian-e-visa?case=${encodeURIComponent(caseFromMagic)}`);
          return;
        }

        router.replace(response.data.resume_url || resumeUrl);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to resume application.");
      }
    };

    void verifyAndResume();
  }, [magicToken, router, caseFromQuery]);

  useEffect(() => {
    if (!caseFromQuery) {
      return;
    }
    if (!authService.isLoggedIn()) {
      return;
    }
    // Always refresh on details view so post-payment status is not stale.
    if (!detailsMode && loadedResumeCaseRef.current === caseFromQuery) {
      return;
    }
    loadedResumeCaseRef.current = caseFromQuery;

    const hydrateFromResume = async () => {
      try {
        const response = await eVisaApi.getResume(caseFromQuery);
        setResumeApplication(response.data.application_data || null);
        const appData = response.data.application_data;
        if (appData?.email_confirmed || appData?.payment_confirmed) {
          updateData({
            fileNumber: caseFromQuery,
            isEmailConfirmed: Boolean(appData.email_confirmed),
            hasPaid: Boolean(appData.payment_confirmed),
          });
        }
        const shouldApplyResumePrefill = Boolean(magicToken || resumeMode || detailsMode);
        if ((response.data.next_step === "registration" && shouldApplyResumePrefill) || detailsMode) {
          applyRegistrationPrefill(caseFromQuery, response.data.registration_prefill);
        } else if (response.data.next_step === "registration") {
          // First-time open should not auto-prefill registration fields.
          resetData();
          reset({
            visaDuration: undefined,
            email: "",
            countryCode: defaultDialCode,
            phone: "",
            fullName: "",
            nationality: undefined,
            countryOfResidence: undefined,
            purposeOfVisit: undefined,
            consent: undefined,
          });
        } else {
          router.replace(response.data.resume_url || `/indian-e-visa?case=${encodeURIComponent(caseFromQuery)}`);
        }
      } catch {
        // Keep local context values if resume fetch fails.
      }
    };

    void hydrateFromResume();
  }, [caseFromQuery, detailsMode, magicToken, resumeMode, router]);

  useEffect(() => {
    if (!draftSessionChecked) return; // ← Add this guard
    const subscription = watch((values) => {
      if (!caseFromQuery && !magicToken && !resumeMode && typeof window !== "undefined") {
        const hasDraftInput = Boolean(
          values.email ||
          values.phone ||
          values.fullName ||
          values.nationality ||
          values.countryOfResidence ||
          values.purposeOfVisit ||
          values.visaDuration ||
          values.consent
        );
        if (hasDraftInput) {
          sessionStorage.setItem(REGISTER_DRAFT_SESSION_KEY, "1");
          setHasActiveDraftSession(true);
        }
      }

      updateData({
        fileNumber: caseFromQuery || data.fileNumber,
        visaDuration: (values.visaDuration as "1-Year" | "5-Year" | undefined) ?? data.visaDuration,
        email: values.email ?? data.email,
        phone: values.phone ?? data.phone,
        countryCode: values.countryCode ?? data.countryCode,
        fullName: values.fullName ?? data.fullName,
        nationality: values.nationality ?? data.nationality,
        countryOfResidence: values.countryOfResidence ?? data.countryOfResidence,
        purposeOfVisit: values.purposeOfVisit ?? data.purposeOfVisit,
        consentAccepted: values.consent ?? data.consentAccepted,
      });
    });

    return () => subscription.unsubscribe();
  }, [watch, updateData, caseFromQuery, magicToken, resumeMode, data]);

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);
    setHasSubmitError(false);

    const nextExtraErrors: Record<string, ExtraApplicantErrors> = {};
    for (const row of extraApplicants) {
      const rowErrors = validateExtraApplicant(row);
      if (Object.keys(rowErrors).length > 0) {
        nextExtraErrors[row.id] = rowErrors;
      }
    }
    if (Object.keys(nextExtraErrors).length > 0) {
      setExtraApplicantErrors(nextExtraErrors);
      toast.error("Please complete name, email, mobile, and Applying From for each added applicant — or remove them.");
      setIsSubmitting(false);
      setHasSubmitError(true);
      setTimeout(() => setHasSubmitError(false), 500);
      return;
    }

    const namedApplicants = [
      { id: "primary", name: data.fullName, applyingFrom: data.countryOfResidence },
      ...extraApplicants.map((row) => ({ id: row.id, name: row.fullName, applyingFrom: row.applyingFrom })),
    ];
    const seenKeys = new Map<string, string>();
    for (const row of namedApplicants) {
      const nameKey = normalizeApplicantName(row.name);
      const countryKey = normalizeApplyingFrom(row.applyingFrom);
      if (!nameKey || !countryKey) continue;
      const duplicateKey = `${nameKey}::${countryKey}`;
      if (seenKeys.has(duplicateKey)) {
        const duplicateId = row.id;
        if (duplicateId !== "primary") {
          nextExtraErrors[duplicateId] = {
            ...(nextExtraErrors[duplicateId] || {}),
            fullName: "This applicant is already added for this service from the same country.",
          };
          setExtraApplicantErrors(nextExtraErrors);
        }
        toast.error(samePersonSameVisaMessage(row.name, row.applyingFrom));
        setIsSubmitting(false);
        setHasSubmitError(true);
        setTimeout(() => setHasSubmitError(false), 500);
        return;
      }
      seenKeys.set(duplicateKey, row.id);
    }
    setExtraApplicantErrors({});

    const readyExtras = extraApplicants.filter(
      (row) => row.fullName.trim() && row.email.trim() && row.phone.trim() && row.applyingFrom.trim(),
    );
    
    try {
      if (isExistingCase) {
        const updateResponse = await eVisaApi.updateRegistration({
          case_number: caseFromQuery,
          email: data.email,
          confirm_email: data.email,
          mobile_number: `${data.countryCode}${data.phone}`,
          full_name: data.fullName,
          nationality: data.nationality,
          country_of_residence: data.countryOfResidence,
          purpose_of_visit: data.purposeOfVisit,
          visa_duration: data.visaDuration,
          consent: data.consent,
        });

        toast.success(updateResponse.message || "Application details updated.");
        updateData({
          fileNumber: caseFromQuery,
          visaDuration: data.visaDuration,
          email: data.email,
          phone: data.phone,
          countryCode: data.countryCode,
          fullName: data.fullName,
          nationality: data.nationality,
          countryOfResidence: data.countryOfResidence,
          purposeOfVisit: data.purposeOfVisit,
          consentAccepted: true,
        });

        if (!detailsMode && updateResponse.data.resume_url) {
          router.replace(updateResponse.data.resume_url);
        }
        return;
      }

      const originOptionId = originOptionIdRef.current;

      const response = await eVisaApi.register({
        email: data.email,
        confirm_email: data.email,
        mobile_number: `${data.countryCode}${data.phone}`,
        full_name: data.fullName,
        nationality: data.nationality,
        country_of_residence: data.countryOfResidence,
        purpose_of_visit: data.purposeOfVisit,
        visa_duration: data.visaDuration,
        consent: data.consent,
        ...(originOptionId ? { origin_option_id: originOptionId } : {}),
      });

      const fileNumber = response.data.case_number;

      // Register additional applicants as separate cases (same visa / residence details)
      if (readyExtras.length > 0) {
        let extrasOk = 0;
        for (const extra of readyExtras) {
          try {
            await eVisaApi.register({
              email: extra.email.trim(),
              confirm_email: extra.email.trim(),
              mobile_number: `${extra.countryCode || data.countryCode}${extra.phone.trim()}`,
              full_name: extra.fullName.trim(),
              nationality: data.nationality,
              country_of_residence: data.countryOfResidence,
              purpose_of_visit: data.purposeOfVisit,
              visa_duration: data.visaDuration,
              consent: data.consent,
              ...(originOptionId ? { origin_option_id: originOptionId } : {}),
            });
            extrasOk += 1;
          } catch {
            // Continue with remaining extras; primary case already created
          }
        }
        if (extrasOk > 0) {
          toast.success(`Primary case created. ${extrasOk} additional applicant${extrasOk > 1 ? "s" : ""} registered.`);
        } else {
          toast.success(response.message || "Registration successful.");
          toast.error("Additional applicants could not be registered. You can add them later.");
        }
      } else {
        toast.success(response.message || "Registration successful.");
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(REGISTER_DRAFT_SESSION_KEY);
      }
      
      updateData({
        fileNumber,
        visaDuration: data.visaDuration,
        email: data.email,
        phone: data.phone,
        countryCode: data.countryCode,
        fullName: data.fullName,
        nationality: data.nationality,
        countryOfResidence: data.countryOfResidence,
        purposeOfVisit: data.purposeOfVisit,
        consentAccepted: true,
        otpExpiresInMinutes: response.data.otp_expires_in_minutes ?? EVISA_DEFAULTS.otpExpiresInMinutes,
        resendCooldownSeconds: response.data.resend_cooldown_seconds ?? EVISA_DEFAULTS.resendCooldownSeconds,
        maxResends: response.data.max_resends ?? EVISA_DEFAULTS.maxResends,
        isEmailConfirmed: true,
        hasPaid: false,
        hasUploaded: false,
      });

      if (response.data.tokens?.access && response.data.tokens?.refresh) {
        setTokens(response.data.tokens.access, response.data.tokens.refresh);
        try {
          await refreshUser();
        } catch {
          // Tokens are stored; auth context recovers on next check.
        }
      }

      const paymentUrl =
        response.data.payment_url ||
        (response.data.confirm_url?.includes("/payment")
          ? response.data.confirm_url
          : null) ||
        `/indian-e-visa/payment?case=${encodeURIComponent(fileNumber)}`;
      const separator = paymentUrl.includes("?") ? "&" : "?";
      const hasCase = /[?&]case=/i.test(paymentUrl);
      router.push(
        hasCase
          ? paymentUrl
          : `${paymentUrl}${separator}case=${encodeURIComponent(fileNumber)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
      setHasSubmitError(true);
      setTimeout(() => setHasSubmitError(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const extractFirstErrorMessage = (formErrors: FieldErrors<RegistrationData>): string => {
    for (const error of Object.values(formErrors)) {
      if (!error) continue;
      if (typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
      }
      if (typeof error === "object") {
        const nested = extractFirstErrorMessage(error as FieldErrors<RegistrationData>);
        if (nested) return nested;
      }
    }
    return "Please check the form details and try again.";
  };

  const onError = (formErrors: FieldErrors<RegistrationData>) => {
    toast.error(extractFirstErrorMessage(formErrors));
    setHasSubmitError(true);
    setTimeout(() => setHasSubmitError(false), 500);
  };

  const detailsSnapshot = watch();
  const detailsMissingCount = [
    detailsSnapshot.fullName,
    detailsSnapshot.phone,
    detailsSnapshot.email,
    detailsSnapshot.countryOfResidence,
    detailsSnapshot.nationality,
  ].filter((value) => {
    if (typeof value === "boolean") return value !== true;
    return !value;
  }).length;

  const displayField = (value?: string) => value && value.trim() ? value : "Not provided";
  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
  };
  const formatBackendLabel = (value?: string | null) => {
    if (!value) return "-";
    return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  };
  const cleanedApplicationNote = useMemo(() => {
    const raw = (applicationRecord?.notes || "").trim();
    if (!raw) return "";

    // Some backend updates can store serialized payload JSON in notes; don't show that to users.
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return "";
      }
    } catch {
      // Non-JSON notes are fine.
    }

    const lowered = raw.toLowerCase();
    if (
      lowered.includes("registration snapshot") ||
      (lowered.includes("purpose:") && lowered.includes("mobile_number")) ||
      (lowered.includes("full_name") && lowered.includes("country_of_residence"))
    ) {
      return "";
    }
    if (raw.startsWith("{") && lowered.includes("case_number") && lowered.includes("purpose_of_visit")) {
      return "";
    }

    return raw;
  }, [applicationRecord?.notes]);
  const pipelineStageRaw =
    applicationRecord?.stage ||
    applicationRecord?.kanban_stage ||
    applicationRecord?.current_stage ||
    resumeApplication?.current_stage ||
    "registered";
  const applicationStageLabel = formatBackendLabel(pipelineStageRaw);

  const resolvedDashboardStatus = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    if (["ready_for_submission", "submitted", "delivered"].includes(stageNormalized)) {
      return formatBackendLabel(stageNormalized);
    }
    if (stageNormalized === "review_pending") {
      return "Under Review";
    }
    return formatBackendLabel(applicationRecord?.unified_status || applicationRecord?.application_status || resumeApplication?.application_status || "under_review");
  })();

  const isPendingDocumentUpload = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    const statusNormalized = String(applicationRecord?.unified_status || applicationRecord?.application_status || resumeApplication?.application_status || "").toLowerCase();

    return (
      ["document_upload_pending", "pending_docs"].includes(stageNormalized) ||
      ["document_upload_pending", "pending_docs"].includes(statusNormalized)
    );
  })();

  const resolvedDashboardMessage = (() => {
    const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
    const statusNormalized = String(applicationRecord?.unified_status || applicationRecord?.application_status || "").toLowerCase();
    if (["document_upload_pending", "pending_docs"].includes(stageNormalized) || ["document_upload_pending", "pending_docs"].includes(statusNormalized)) {
      return "Your application is pending document upload. Please upload required documents to continue.";
    }
    if (stageNormalized === "ready_for_submission") {
      return "Your documents are approved and your application is ready for submission.";
    }
    if (stageNormalized === "submitted") {
      return "Your application has been submitted. We will update you when a decision is received.";
    }
    if (stageNormalized === "delivered") {
      return "Your application is complete. You will receive your final e-Visa document and completion update shortly on your registered email.";
    }
    if (String(applicationRecord?.unified_status || applicationRecord?.application_status || "").toLowerCase() === "reuploaded_pending_review") {
      return "Corrected documents received. Your re-upload is pending admin review.";
    }
    return cleanedApplicationNote || "Your application is being processed. We will update you as soon as there is progress.";
  })();

  const stageNormalized = String(pipelineStageRaw || "").toLowerCase();
  const statusNormalized = String(applicationRecord?.unified_status || applicationRecord?.application_status || resumeApplication?.application_status || "").toLowerCase();
  const isCompletedDashboard = ["delivered", "completed"].includes(stageNormalized) || ["delivered", "completed"].includes(statusNormalized);
  const resolvedApplicationReference = String(applicationRecord?.reference_number || caseFromQuery || "").trim();
  const normalizedDecisionReference = (() => {
    const raw = String(applicationRecord?.notes || "").trim();
    if (!raw) return "N/A";

    const submittedMatch = raw.match(/Govt\s*ref\s*:\s*([^\n]+)/i);
    if (submittedMatch?.[1]) {
      return submittedMatch[1].trim();
    }

    const decisionMatch = raw.match(/Decision\s*ref\s*:\s*([^\n]+)/i);
    if (decisionMatch?.[1]) {
      return decisionMatch[1].trim();
    }

    return cleanedApplicationNote || "N/A";
  })();

  useEffect(() => {
    if (!detailsMode || !isCompletedDashboard || !resolvedApplicationReference) {
      return;
    }

    let cancelled = false;

    const loadSubmittedReview = async () => {
      try {
        const testimonials = await getPublicTestimonials();
        const match = testimonials.find((testimonial) => String(testimonial.application_reference || "").trim().toLowerCase() === resolvedApplicationReference.toLowerCase());

        if (cancelled || !match) {
          return;
        }

        setReviewSubmitted(true);
        setReviewAuthorName(match.author_name || "");
        setReviewText(match.testimonial_text || "");
        setReviewRating(Math.max(1, Math.min(5, Math.round(Number(match.rating || 5)))));
      } catch {
        // Keep local review form available if lookup fails.
      }
    };

    void loadSubmittedReview();

    return () => {
      cancelled = true;
    };
  }, [detailsMode, isCompletedDashboard, resolvedApplicationReference]);

  const submitCompletionReview = async () => {
    const testimonialText = reviewText.trim();

    if (!testimonialText) {
      toast.error("Please write your review before submitting.");
      return;
    }

    try {
      setReviewSubmitting(true);
      await submitTestimonial({
        author_name: reviewAuthorName.trim() || undefined,
        testimonial_text: testimonialText,
        service_type: String(resumeApplication?.service_name || applicationRecord?.service_name || "e-Visa").trim() || "e-Visa",
        rating: reviewRating,
        application_reference: resolvedApplicationReference || undefined,
      });
      setReviewText("");
      setReviewAuthorName("");
      setReviewRating(5);
      setReviewSubmitted(true);
      setReviewModalOpen(false);
      toast.success("Thanks. Your review is now live on the homepage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const openCaseSummaryPrint = async () => {
    const referenceLine = resolvedApplicationReference || "N/A";
    const serviceLine = String(resumeApplication?.service_name || applicationRecord?.service_name || "Indian e-Visa").trim() || "Indian e-Visa";
    const statusLine = resolvedDashboardStatus || "Completed";
    const submissionLine = formatDate(applicationRecord?.submission_date || applicationRecord?.approval_date || applicationRecord?.completion_date);
    const decisionLine = formatDate(applicationRecord?.approval_date || applicationRecord?.completion_date);
    const notesLine = normalizedDecisionReference;
    const safeReference = String(referenceLine)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "case-summary";

    const fallbackToPrintDialog = () => {
      const printFrame = document.createElement("iframe");
      printFrame.setAttribute("aria-hidden", "true");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);

      const printHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FlyOCI Case Summary</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; color: #123; background: #f5f8fc; }
            .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #dbe8f7; border-radius: 20px; padding: 28px; box-shadow: 0 20px 50px rgba(18, 47, 89, 0.08); }
            h1 { margin: 0 0 8px; font-size: 30px; color: #0f4aa6; }
            p { margin: 0 0 10px; line-height: 1.5; }
            .meta { margin-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .box { border: 1px solid #dbe8f7; border-radius: 14px; padding: 14px; background: #f9fbff; }
            .label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5d7089; margin-bottom: 6px; }
            .value { font-size: 15px; font-weight: 600; color: #1f3558; }
            .footer { margin-top: 22px; font-size: 12px; color: #6b7f99; }
            @media print {
              body { background: #fff; padding: 0; }
              .sheet { border: 0; box-shadow: none; border-radius: 0; max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>FlyOCI Case Summary</h1>
            <p>Your completed case record is shown below.</p>
            <div class="meta">
              <div class="box"><span class="label">Reference</span><span class="value">${referenceLine}</span></div>
              <div class="box"><span class="label">Service</span><span class="value">${serviceLine}</span></div>
              <div class="box"><span class="label">Status</span><span class="value">${statusLine}</span></div>
              <div class="box"><span class="label">Submission / Finalized Date</span><span class="value">${submissionLine}</span></div>
              <div class="box"><span class="label">Decision Date</span><span class="value">${decisionLine}</span></div>
              <div class="box"><span class="label">Decision Reference</span><span class="value">${notesLine}</span></div>
            </div>
            <p class="footer">FlyOCI is an independent private service provider.</p>
          </div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
      `;

      const frameDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDocument) {
        document.body.removeChild(printFrame);
        toast.error("Unable to prepare the printable summary.");
        return;
      }

      frameDocument.open();
      frameDocument.write(printHtml);
      frameDocument.close();

      const cleanup = () => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
        window.removeEventListener("afterprint", cleanup);
      };

      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 5000);
    };

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      let y = 56;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("FlyOCI Case Summary", 48, y);
      y += 26;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(93, 112, 137);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 48, y);
      y += 26;

      const rows: Array<[string, string]> = [
        ["Reference", String(referenceLine)],
        ["Service", String(serviceLine)],
        ["Status", String(statusLine)],
        ["Submission / Finalized Date", String(submissionLine)],
        ["Decision Date", String(decisionLine)],
        ["Decision Reference", String(notesLine)],
      ];

      doc.setTextColor(31, 53, 88);
      doc.setFontSize(12);

      rows.forEach(([label, value]) => {
        if (y > 760) {
          doc.addPage();
          y = 56;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 48, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(value || "N/A", 380);
        doc.text(wrapped, 220, y);
        y += Math.max(22, wrapped.length * 14);
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 127, 153);
      doc.text("FlyOCI is an independent private service provider.", 48, 800);

      doc.save(`flyoci-case-summary-${safeReference}.pdf`);
      toast.success("Case summary PDF is downloading.");
    } catch {
      toast.error("Direct PDF download failed. Opening print dialog instead.");
      fallbackToPrintDialog();
    }
  };

  const formatDocumentStatus = (status?: string) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (isCompletedDashboard && ["pending", "uploaded", "in_review", "not_verified"].includes(normalized)) {
      return "Approved";
    }
    return formatBackendLabel(status || "pending");
  };

  useEffect(() => {
    if (!detailsMode || !caseFromQuery || !authService.isLoggedIn()) {
      return;
    }

   const fetchApplicationExtras = async () => {
  try {
    const [detailRes, docsRes, profileRes] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(caseFromQuery)}/`, { method: "GET" }),
      authenticatedFetch(`${API_BASE_URL}/applications/${encodeURIComponent(caseFromQuery)}/documents/`, { method: "GET" }),
      authenticatedFetch(`${API_BASE_URL}/auth/me/`, { method: "GET" }),
    ]);

    const detailJson = await detailRes.json().catch(() => ({}));
    const docsJson = await docsRes.json().catch(() => ({}));

    if (detailRes.ok) {
      const appData = ((detailJson as { data?: any }).data || null);
      setApplicationRecord(appData as {
        reference_number?: string;
        stage?: string;
        kanban_stage?: string | null;
        application_status?: string;
        unified_status?: string;
        current_stage?: string;
        application_date?: string | null;
        submission_date?: string | null;
        approval_date?: string | null;
        completion_date?: string | null;
        created_at?: string;
        updated_at?: string;
        notes?: string;
        service_name?: string;
        payment_confirmed?: boolean;
        email_confirmed?: boolean;
        audit_result?: "pending" | "green" | "amber" | "red" | string;
        auditor_notes?: string;
        correction_requested_at?: string | null;
        flagged_documents?: Array<{
          document_type?: string;
          document_name?: string;
          issue_reason?: string;
          issue?: string;
          required_action?: string;
          status?: string;
        }>;
        latest_audit_findings?: Array<{
          id?: number;
          document_type?: string;
          document_name?: string;
          finding_description?: string;
          required_action?: string;
          priority?: string;
        }>;
      });

      if (appData) {
        setResumeApplication((prev) => ({
          ...(prev || {
            case_number: caseFromQuery,
            application_status: "",
            unified_status: "",
            current_stage: "",
            service_name: "",
            service_type: "",
            application_date: null,
            created_at: "",
            updated_at: "",
            consent_captured: false,
            audit_result: "",
            auditor_notes: "",
            flagged_documents: [],
            correction_requested: false,
            correction_requested_at: null,
            correction_resubmitted_at: null,
            upload_url: "",
          }),
          ...prev,
          email_confirmed: Boolean(
            appData.email_confirmed ?? prev?.email_confirmed ?? false,
          ),
          payment_confirmed: Boolean(
            appData.payment_confirmed ?? prev?.payment_confirmed ?? false,
          ),
          application_status: appData.application_status || prev?.application_status || "",
          unified_status: appData.unified_status || prev?.unified_status || "",
          current_stage: appData.current_stage || prev?.current_stage || "",
          service_name: appData.service_name || prev?.service_name || "",
          updated_at: appData.updated_at || prev?.updated_at || "",
        }));
        if (appData.payment_confirmed || appData.email_confirmed) {
          updateData({
            fileNumber: caseFromQuery,
            hasPaid: Boolean(appData.payment_confirmed),
            isEmailConfirmed: Boolean(appData.email_confirmed),
          });
        }
      }

      if (appData?.nationality && !watch("nationality")) {
        setValue("nationality", appData.nationality as RegistrationData["nationality"], { shouldDirty: true, shouldTouch: true });
        updateData({ nationality: appData.nationality });
      }
    }

    if (docsRes.ok) {
      setDocuments((((docsJson as { data?: unknown[] }).data || []) as Array<{
        id: number;
        document_type: string;
        verification_status: string;
        upload_date: string | null;
        updated_at: string;
      }>));
    }

    // ✅ Fill missing fields from profile (only on first load, not on interval refetches)
if (profileRes.ok) {
  const profileJson = await profileRes.json().catch(() => ({}));
  const coreUser = (profileJson as any)?.data?.core_user;
  console.log("[FETCH EXTRAS] coreUser received:", coreUser);

 if (coreUser) {
  if (coreUser.phone_number) {
    setValue("phone", coreUser.phone_number, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    updateData({ phone: coreUser.phone_number, countryCode: defaultDialCode });
  }

    if (coreUser.nationality && !watch("nationality")) {
      const nationalityMap: Record<string, string> = {
        "British": "British",
        "American": "American",
        "Canadian": "Canadian",
        "Indian": "Indian",
        "Australian": "Other",
      };
      const mapped = nationalityMap[coreUser.nationality] ?? "Other";
      setValue("nationality", mapped as RegistrationData["nationality"], { shouldDirty: true, shouldTouch: true });
      updateData({ nationality: mapped });
    }

    const residenceMap: Record<string, string> = {
      "Australia": "Australia",
      "United Kingdom": "United Kingdom",
      "United States": "United States",
      "Canada": "Canada",
      "UAE": "UAE",
      "Singapore": "Singapore",
    };
    if (coreUser.country) {
      const mapped = residenceMap[coreUser.country] ?? "Other";
      setValue("countryOfResidence", mapped as RegistrationData["countryOfResidence"], { shouldDirty: true });
      updateData({ countryOfResidence: mapped });
    }

  }
}
  } catch {
    // Keep showing available resume data if docs/details fetch fails.
  }
};


    void fetchApplicationExtras();

    const intervalId = window.setInterval(() => {
      void fetchApplicationExtras();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [detailsMode, caseFromQuery]);



  
  useEffect(() => {
    if (!detailsMode) return;
    if (!watch("visaDuration")) {
      setValue("visaDuration", "1-Year");
    }
    if (!watch("purposeOfVisit")) {
      setValue("purposeOfVisit", "Tourism");
    }
  }, [detailsMode, setValue, watch]);

  const inputClasses = () =>
    detailsMode
      ? "w-full px-4 py-3 border rounded-[14px] font-body text-[14px] bg-[#f1f2f6] outline-none transition-all duration-200 border-[#d7dbe8] focus:border-[#7f86a5] focus:shadow-[0_0_0_3px_rgba(127,134,165,0.2)] disabled:opacity-50 disabled:bg-gray-100 text-[#303a52]"
      : "w-full px-3 py-2.5 border rounded-lg font-body text-[12px] bg-[#f8fafd] outline-none transition-all duration-200 border-[#d7e3f2] focus:border-[#1a56db] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.16)] disabled:opacity-50 disabled:bg-gray-50";

  const isPaymentConfirmed =
    resumeApplication?.payment_confirmed === true ||
    Boolean((applicationRecord as { payment_confirmed?: boolean } | null)?.payment_confirmed);
  const isEmailConfirmed =
    resumeApplication?.email_confirmed === true ||
    Boolean((applicationRecord as { email_confirmed?: boolean } | null)?.email_confirmed);
  const isFormLocked = detailsMode && isPaymentConfirmed && isEmailConfirmed;
  const isEVisaCorrectionRequested =
    String(applicationRecord?.application_status || "").toLowerCase() === "correction_requested" ||
    String(applicationRecord?.current_stage || "").toLowerCase() === "correction_requested" ||
    String(applicationRecord?.unified_status || "").toLowerCase() === "pending_docs";
  const hasAnyFlaggedDocuments =
    Array.isArray(applicationRecord?.flagged_documents) && applicationRecord.flagged_documents.length > 0;
  const latestReuploadRequest = useMemo(() => {
    const requests = Array.isArray(applicationRecord?.reupload_requests) ? applicationRecord.reupload_requests : [];
    if (requests.length === 0) {
      return null;
    }
    return [...requests].sort((left, right) => {
      const leftTs = new Date(left.created_at || "").getTime();
      const rightTs = new Date(right.created_at || "").getTime();
      return rightTs - leftTs;
    })[0] || null;
  }, [applicationRecord?.reupload_requests]);

  const activeFlaggedDocuments = useMemo(() => {
    const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

    const pickActive = (source: Array<{
      document_type?: string;
      document_name?: string;
      issue_reason?: string;
      issue?: string;
      required_action?: string;
      status?: string;
    }>) => {
      const filtered = source.filter((item) => {
        const status = normalize(item.status);
        return !["reuploaded", "resolved", "done"].includes(status);
      });

      const deduped = filtered.reduce((acc, item) => {
        const key = normalize(item.document_type) || normalize(item.document_name);
        if (!key) return acc;
        acc.set(key, item);
        return acc;
      }, new Map<string, (typeof filtered)[number]>());

      return Array.from(deduped.values());
    };

    const latestRequested = Array.isArray(latestReuploadRequest?.flagged_documents)
      ? latestReuploadRequest.flagged_documents
      : [];
    const latestActive = pickActive(latestRequested);
    if (latestActive.length > 0) {
      return latestActive;
    }

    const fallbackRequested = Array.isArray(applicationRecord?.flagged_documents)
      ? applicationRecord.flagged_documents
      : [];
    return pickActive(fallbackRequested);
  }, [latestReuploadRequest, applicationRecord?.flagged_documents]);
  const correctionRequestedAtMs = useMemo(() => {
    const candidate =
      applicationRecord?.correction_requested_at ||
      latestReuploadRequest?.created_at ||
      "";
    const parsed = candidate ? new Date(candidate).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }, [
    applicationRecord?.correction_requested_at,
    latestReuploadRequest?.created_at,
  ]);
  const pendingFlaggedDocuments = useMemo(() => {
    const flaggedItems = activeFlaggedDocuments;
    if (flaggedItems.length === 0) {
      return [];
    }

    const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

    return flaggedItems.filter((flagged) => {
      const flaggedType = normalize(flagged.document_type);
      const flaggedName = normalize(flagged.document_name);

      const latestMatch = documents
        .filter((doc) => {
          const docType = normalize(doc.document_type);
          const docName = normalize(doc.document_name);
          const originalName = normalize(doc.original_filename);
          const storedName = normalize(doc.stored_filename);

          const matchType = Boolean(flaggedType) && docType === flaggedType;
          const matchName =
            Boolean(flaggedName) &&
            (docName === flaggedName || originalName === flaggedName || storedName === flaggedName);

          return matchType || matchName;
        })
        .sort((a, b) => {
          const aTs = new Date(a.upload_date || a.created_at || a.updated_at || "").getTime();
          const bTs = new Date(b.upload_date || b.created_at || b.updated_at || "").getTime();
          return bTs - aTs;
        })[0];

      if (!latestMatch) {
        return true;
      }

      const latestUploadedAt = new Date(
        latestMatch.upload_date || latestMatch.created_at || latestMatch.updated_at || "",
      ).getTime();

      if (!Number.isFinite(latestUploadedAt) || correctionRequestedAtMs <= 0) {
        return true;
      }

      return latestUploadedAt <= correctionRequestedAtMs;
    });
  }, [activeFlaggedDocuments, documents, correctionRequestedAtMs]);
  const canShowInteractiveCorrection = pendingFlaggedDocuments.length > 0;
  const adminMessages = useMemo(() => {
    const messagesFromApi = Array.isArray(applicationRecord?.admin_messages) ? applicationRecord.admin_messages : [];
    if (messagesFromApi.length > 0) {
      return messagesFromApi;
    }

    const auditLogs = Array.isArray(applicationRecord?.audit_logs) ? applicationRecord.audit_logs : [];
    return auditLogs
      .filter((item) => String(item.action || "").toLowerCase() === "admin_customer_message")
      .map((item) => ({
        created_at: item.timestamp,
        subject: item.metadata?.subject || "FlyOCI update",
        message: item.metadata?.description || item.metadata?.message || "",
      }))
      .filter((item) => item.message.trim().length > 0);
  }, [applicationRecord?.admin_messages, applicationRecord?.audit_logs]);
  const latestReuploadRequestNote = useMemo(() => latestReuploadRequest?.note || "", [latestReuploadRequest]);

  const fieldDisabledClass = isReadOnlyApplication ? "opacity-90" : "";
  
  const shouldShowField = (value?: string | null) => {
    if (!detailsMode) return true;
    return value && value.trim() ? true : false;
  };

  const handleCorrectionReupload = async (
    flaggedDocumentName: string,
    file: File,
    documentKey: string,
    flaggedDocumentType?: string,
  ) => {
    const caseNumber = (caseFromQuery || data.fileNumber || "").trim().toUpperCase();
    const applicantEmail = (watch("email") || data.email || "").trim();

    if (!caseNumber) {
      toast.error("Case number is missing.");
      return;
    }
    if (!applicantEmail) {
      toast.error("Email is required to submit re-upload.");
      return;
    }

    const formData = new FormData();
    formData.append("case_number", caseNumber);
    formData.append("email", applicantEmail);
    formData.append("flagged_document_name", flaggedDocumentName);
    if (flaggedDocumentType) {
      formData.append("flagged_document_type", flaggedDocumentType);
    }
    formData.append("document", file);

    try {
      setReuploadingDocumentKey(documentKey);
      setReuploadConfirmationMessage("");

      const response = await fetch(`${API_BASE_URL}/evisa/correction-resubmit/`, {
        method: "POST",
        body: formData,
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (json as { message?: string }).message || "Failed to submit correction re-upload.";
        throw new Error(message);
      }

      const responseData = (json as {
        data?: {
          application_status?: string;
          current_stage?: string;
          all_reuploaded?: boolean;
          remaining_count?: number;
          document?: {
            id?: number;
            document_type?: string;
            document_name?: string;
            original_filename?: string;
            uploaded_at?: string | null;
            verification_status?: string;
          };
        };
      }).data;

      const allReuploaded = responseData?.all_reuploaded === true;
      setReuploadConfirmationMessage(
        allReuploaded
          ? "All documents re-uploaded. Our team will review shortly."
          : `${responseData?.remaining_count ?? 1} more document(s) still required.`,
      );
      setApplicationRecord((prev) => {
        if (!prev) return prev;
        const nextApplicationStatus = responseData?.application_status || prev.application_status;
        const nextStage = responseData?.current_stage || prev.current_stage;
        return {
          ...prev,
          application_status: nextApplicationStatus,
          current_stage: nextStage,
          unified_status: allReuploaded
            ? "reuploaded_pending_review"
            : "pending_docs",
        };
      });

      if (responseData?.document?.id && responseData.document.document_type) {
        setDocuments((prev) => [
          {
            id: responseData.document?.id || 0,
            document_type: responseData.document?.document_type || "other",
            document_name: responseData.document?.document_name || responseData.document?.original_filename || file.name || flaggedDocumentName,
            original_filename: responseData.document?.original_filename || file.name,
            verification_status: responseData.document?.verification_status || "pending",
            upload_date: responseData.document?.uploaded_at || new Date().toISOString(),
            updated_at: responseData.document?.uploaded_at || new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      toast.success(
        allReuploaded
          ? "All correction documents uploaded."
          : "Document uploaded. Please upload the remaining document(s).",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit correction re-upload.");
    } finally {
      setReuploadingDocumentKey("");
    }
  };

  if (detailsMode) {
    const applicantName = detailsSnapshot.fullName || data.fullName || "Applicant";
    const appId = caseFromQuery || "N/A";

    return (
      <div className="min-h-screen bg-[#eef4ff] text-[#0f1f3d]">
        <div className="border-b border-[#d4e3ff] bg-[#eaf2ff]">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-[#6982ab]">
              Dashboard / Application / <span className="text-[#143974] font-semibold">{applicantName}</span>
            </p>
            <p className="text-[12px] text-[#7994bf] font-medium">Application ID: {appId}</p>
          </div>
        </div>

        <main className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          <section className="rounded-2xl border border-[#d4e3ff] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,59,120,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#5e7599]">
              <p>
                Application: <span className="font-semibold text-[#173c78]">{resumeApplication?.service_name || "e-Visa Application"}</span>
              </p>
              <p>
                Status: <span className="font-semibold text-[#173c78]">{resolvedDashboardStatus}</span> · Stage: <span className="font-semibold text-[#173c78]">{applicationStageLabel}</span>
              </p>
              <p>
                Updated: <span className="font-semibold text-[#173c78]">{formatDate(applicationRecord?.updated_at || resumeApplication?.updated_at)}</span>
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <h3 className="text-[16px] font-semibold text-[#173c78]">Application Status</h3>
              <span className="text-[12px] font-semibold text-[#5f7ca8] uppercase">{resolvedDashboardStatus}</span>
            </div>
            <div className="p-4 sm:p-5 bg-[#f8fbff] space-y-3">
              <p className="text-[13px] text-[#1d2f4f]">{resolvedDashboardMessage}</p>
              {isPendingDocumentUpload ? (
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                  className="rounded-lg bg-[#0f2f66] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Upload Documents
                </button>
              ) : null}
            </div>
          </section>

          {isCompletedDashboard ? (
            <>
              <div className="mt-1 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#1a56db]">Download case summary</p>
                  <p className="mt-1 text-xs text-[#5e7599]">Open a compact summary and save it as a PDF.</p>
                  <button
                    type="button"
                    onClick={openCaseSummaryPrint}
                    className="mt-3 inline-flex items-center rounded-lg bg-[#1a56db] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1648b8]"
                  >
                    View case summary
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#1a56db]">Book your next service</p>
                  <p className="mt-1 text-xs text-[#5e7599]">Start a new OCI, passport or visa application.</p>
                  <button
                    type="button"
                    onClick={() => router.push("/services")}
                    className="mt-3 inline-flex items-center rounded-lg bg-[#173c78] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Book next service
                  </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#1a56db]">Leave a review</p>
                  <p className="mt-1 text-xs text-[#5e7599]">A short note and star rating help others decide faster.</p>
                  {reviewSubmitted ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      Thanks for the review. It has been saved and approved for the homepage.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(true)}
                      className="mt-3 inline-flex items-center rounded-lg bg-[#1a56db] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1648b8]"
                    >
                      Leave a review
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/services")}
                  className="inline-flex items-center rounded-full border border-[#9fc0ef] bg-white px-5 py-2.5 text-base font-semibold text-[#2388ff] transition hover:bg-[#f1f7ff]"
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> Start another application
                </button>
              </div>

              {reviewModalOpen ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
                  onClick={() => setReviewModalOpen(false)}
                  role="presentation"
                >
                  <div
                    className="w-full max-w-lg rounded-2xl border border-[#d4e3ff] bg-white p-5 shadow-[0_22px_48px_rgba(16,44,92,0.28)]"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Leave a review"
                  >
                    <h4 className="text-lg font-semibold text-[#173c78]">Leave a review</h4>
                    <p className="mt-1 text-sm text-[#5e7599]">Share your e-Visa experience. We publish approved reviews on the homepage.</p>

                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7ca8]">Your name (optional)</label>
                    <input
                      value={reviewAuthorName}
                      onChange={(event) => setReviewAuthorName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d4e3ff] bg-[#f9fbff] px-3 py-2 text-sm text-[#1d2f4f] outline-none focus:border-[#7aa8e8] focus:ring-2 focus:ring-[#bfd7ff]"
                      placeholder="Jane Smith"
                    />

                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7ca8]">Rating</label>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          className="rounded-md p-1 text-amber-500 transition hover:scale-105"
                          aria-label={`Set rating ${value}`}
                        >
                          <Star className={`h-5 w-5 ${reviewRating >= value ? "fill-current" : ""}`} />
                        </button>
                      ))}
                    </div>

                    <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7ca8]">Review</label>
                    <textarea
                      value={reviewText}
                      onChange={(event) => setReviewText(event.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-[#d4e3ff] bg-[#f9fbff] px-3 py-2 text-sm text-[#1d2f4f] outline-none focus:border-[#7aa8e8] focus:ring-2 focus:ring-[#bfd7ff]"
                      placeholder="Great support and clear updates throughout the process."
                    />

                    <div className="mt-5 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewModalOpen(false)}
                        className="rounded-lg border border-[#c8d9f7] px-3 py-2 text-sm font-semibold text-[#355f9b] hover:bg-[#f2f7ff]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitCompletionReview}
                        disabled={reviewSubmitting}
                        className="rounded-lg bg-[#173c78] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0f2f66] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {reviewSubmitting ? "Submitting..." : "Submit review"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <h3 className="text-[16px] font-semibold text-[#173c78]">Admin Messages</h3>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8bab]">Latest updates from team</span>
            </div>
            <div className="p-4 sm:p-5 space-y-3 bg-[#f8fbff]">
              {adminMessages.length > 0 ? (
                adminMessages.slice().reverse().map((messageItem, index) => (
                  <div key={`${messageItem.created_at || "msg"}-${index}`} className="rounded-xl border border-[#d9e4f7] bg-white p-3">
                    <p className="text-[13px] font-semibold text-[#1d2f4f]">{messageItem.subject || "FlyOCI update"}</p>
                    <p className="mt-1 text-[12px] text-[#5e7599] whitespace-pre-wrap">{messageItem.message}</p>
                    {messageItem.created_at ? <p className="mt-1 text-[11px] text-[#8aa0bf]">{formatDate(messageItem.created_at)}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[#5e7599]">No admin messages yet.</p>
              )}
            </div>
          </section>

          {!isPaymentConfirmed ? (
          <section className="rounded-2xl border border-[#f0d89d] bg-[#fff6de] border-l-[3px] border-l-[#e6a72f] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe2a8] text-[#a66800]">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-[#5f3a00]">Payment Required to Activate Application</h2>
                <p className="mt-1 text-[13px] text-[#8a6a2d]">
                  Complete payment to unlock all sections and continue with full application processing.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/payment?case=${encodeURIComponent(caseFromQuery)}`)}
                  className="mt-3 rounded-lg bg-[#0f2f66] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Complete Payment Now
                </button>
              </div>
            </div>
          </section>
          ) : (
          <section className="rounded-2xl border border-[#b8e6c2] bg-[#ecfff1] border-l-[3px] border-l-[#24a148] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#1f6b35]">Payment Confirmed</h2>
                <p className="mt-1 text-[13px] text-[#3b7a4c]">
                  Your application is in progress as per backend stage updates.
                </p>
              </div>
            </div>
          </section>
          )}

          {isEVisaCorrectionRequested && !hasAnyFlaggedDocuments && documents.length > 0 ? (
          <section className="rounded-2xl border border-[#f0d89d] bg-[#fff6de] border-l-[3px] border-l-[#e6a72f] px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe2a8] text-[#a66800]">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-[16px] font-semibold text-[#5f3a00]">Action Required: Re-upload Documents</h2>
                <p className="mt-1 text-[13px] text-[#8a6a2d]">
                  Our team requested updated documents for your e-Visa application. Please re-upload from the upload step.
                </p>
                {latestReuploadRequestNote ? (
                  <p className="mt-2 text-[12px] text-[#7b5b23]">
                    Admin note: <span className="font-semibold">{latestReuploadRequestNote}</span>
                  </p>
                ) : null}
                {applicationRecord?.notes ? (
                  <p className="mt-2 text-[12px] text-[#7b5b23]">
                    Latest note: <span className="font-semibold">{applicationRecord.notes}</span>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                  className="mt-3 rounded-lg bg-[#0f2f66] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0c2551]"
                >
                  Re-upload Documents
                </button>
              </div>
            </div>
          </section>
          ) : null}

          {(applicationRecord?.audit_result && applicationRecord.audit_result !== "pending") || canShowInteractiveCorrection ? (
          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Audit Result</h3>
              </div>
              <span className="text-[12px] font-semibold text-[#5f7ca8] uppercase">{applicationRecord?.audit_result || "PENDING"}</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5 space-y-3">
              <p className="text-[13px] text-[#1d2f4f]">
                {applicationRecord?.audit_result === "green"
                  ? "All checks passed. You can proceed to the next step."
                  : "Corrections are required before approval. Please upload corrected documents."}
              </p>
              {applicationRecord?.auditor_notes ? (
                <div className="rounded-xl border border-[#d9e4f7] bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Auditor Notes</p>
                  <p className="mt-2 text-[13px] text-[#1d2f4f] whitespace-pre-wrap">{applicationRecord?.auditor_notes}</p>
                </div>
              ) : null}
              {/* // FLYOCI-FIX: BUG-5 */}
              {canShowInteractiveCorrection ? (
                <div className="space-y-2">
                  <h4 className="text-[14px] font-semibold text-[#173c78]">Reupload Required Documents</h4>
                  <button
                    type="button"
                    onClick={() => router.push(`/indian-e-visa/upload?case=${encodeURIComponent(caseFromQuery || data.fileNumber || "")}`)}
                    className="rounded-lg bg-[#0f2f66] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0c2551]"
                  >
                    Open Upload Page
                  </button>
                  {pendingFlaggedDocuments.map((item, index) => {
                    const documentLabel = item.document_name || item.document_type || `Document ${index + 1}`;
                    const documentKey = `${documentLabel}-${index}`;
                    const isUploading = reuploadingDocumentKey === documentKey;

                    return (
                    <div key={documentKey} className="rounded-xl border border-[#d9e4f7] bg-white px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#1d2f4f]">{documentLabel}</p>
                      <p className="text-[12px] text-[#6c84ab] mt-1">Issue: {item.issue_reason || item.issue || "Correction required."}</p>
                      <p className="text-[12px] text-[#6c84ab]">Required action: {item.required_action || "Please upload corrected document."}</p>
                      <div className="mt-3">
                        <label className="inline-flex cursor-pointer items-center rounded-lg bg-[#123c84] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0f2f66] disabled:cursor-not-allowed disabled:opacity-70">
                          {isUploading ? "Uploading..." : `Upload ${documentLabel}`}
                          <input
                            type="file"
                            className="hidden"
                            disabled={isUploading || Boolean(reuploadingDocumentKey)}
                            onChange={(event) => {
                              const selectedFile = event.target.files?.[0];
                              if (selectedFile) {
                                void handleCorrectionReupload(documentLabel, selectedFile, documentKey, item.document_type);
                              }
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    );
                  })}
                  {reuploadConfirmationMessage ? (
                    <p className="text-[12px] font-semibold text-[#1f6b35]">{reuploadConfirmationMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
          ) : null}

          <div className="space-y-5">
            <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[18px] font-semibold text-[#173c78]">1. Applicant Personal Details</h3>
              </div>
              <span className="text-[13px] font-semibold text-[#d04b63]">{detailsMissingCount} items missing</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shouldShowField(detailsSnapshot.fullName || data.fullName) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Full name</label>
                    <input {...register("fullName")} disabled={isFormLocked} className={`mt-2 ${inputClasses()}`} placeholder="Enter full name" />
                  </div>
                )}
                
               {(detailsMode || shouldShowField(detailsSnapshot.phone || data.phone) || shouldShowField(detailsSnapshot.countryCode || data.countryCode)) && (() => {
  return (
    <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Mobile number</label>
      <div className="mt-2 flex gap-2">
        {isFormLocked ? (
          <div className={`${inputClasses()} flex-1 flex items-center`}>
            {watch("phone") || data.phone || "Not provided"}
          </div>
        ) : (
          <input
            {...register("phone")}
            className={`${inputClasses()} flex-1`}
            placeholder="Enter mobile number"
          />
        )}
      </div>
    </div>
  );
})()}

                {shouldShowField(detailsSnapshot.email || data.email) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Email</label>
                    <input {...register("email")} disabled={isFormLocked} type="email" className={`mt-2 ${inputClasses()}`} placeholder="Enter email" />
                  </div>
                )}
                {(detailsMode || shouldShowField(detailsSnapshot.countryOfResidence || data.countryOfResidence)) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Country of residence</label>
                    <Controller
                      name="countryOfResidence"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelectField
                          value={field.value}
                          options={residenceOptions}
                          placeholder="Search and select country"
                          loading={isCountryOptionsLoading}
                          disabled={isFormLocked}
                          className={`mt-2 ${inputClasses()}`}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                )}
                {(detailsMode || shouldShowField(detailsSnapshot.nationality || data.nationality)) && (
                  <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Nationality</label>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelectField
                          value={field.value}
                          options={nationalityOptions}
                          placeholder="Search and select nationality"
                          loading={isCountryOptionsLoading}
                          disabled={isFormLocked}
                          className={`mt-2 ${inputClasses()}`}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                )}
                <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 shadow-[0_8px_24px_rgba(22,62,120,0.04)]">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Case number</label>
                  <p className="mt-2 min-h-[48px] rounded-lg bg-[#edf3ff] px-3 py-2 text-[14px] font-semibold text-[#1d2f4f] flex items-center">
                    {displayField(caseFromQuery || data.fileNumber || "")}
                  </p>
                </div>
              </div>

              <input type="hidden" {...register("visaDuration")} />
              <input type="hidden" {...register("purposeOfVisit")} />
              <input type="hidden" {...register("consent")} />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-lg bg-[#edf3ff] px-4 py-2 text-[13px] font-semibold text-[#1d3f74]">
                  {isSubmitting ? "Saving changes..." : "Auto-save is on"}
                </div>
                <p className="text-[12px] text-[#6d88b1]">
                  Changes update the application record automatically.
                </p>
              </div>
            </div>
          </section>
          </div>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Documents Received</h3>
              </div>
              <span className="text-[12px] font-semibold text-[#5f7ca8]">{documents.length} document(s)</span>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5">
              {documents.length === 0 ? (
                <p className="text-[13px] text-[#6f88ae]">No documents received yet for this application.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-[#d9e4f7] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1d2f4f]">{formatBackendLabel(doc.document_type)}</p>
                      <p className="text-[12px] text-[#6c84ab]">Status: <span className="font-semibold">{formatDocumentStatus(doc.verification_status)}</span></p>
                      <p className="text-[12px] text-[#6c84ab]">Uploaded: <span className="font-semibold">{formatDate(doc.upload_date || doc.updated_at)}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d4e3ff] bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#edf3ff] border-b border-[#d9e6ff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#123c84]" />
                <h3 className="text-[16px] font-semibold text-[#173c78]">Backend Application Data</h3>
              </div>
            </div>
            <div className="bg-[#f4f8ff] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Application date", value: formatDate(applicationRecord?.application_date || resumeApplication?.application_date) },
                { label: "Submission date", value: formatDate(applicationRecord?.submission_date) },
                { label: "Approval date", value: formatDate(applicationRecord?.approval_date) },
                { label: "Completion date", value: formatDate(applicationRecord?.completion_date) },
                { label: "Current stage", value: applicationStageLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#d9e4f7] bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">{item.label}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#1d2f4f]">{item.value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-[#d9e4f7] bg-white p-4 sm:col-span-2 lg:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a8bab]">Verification Summary</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Email: <span className="text-[#355f9b]">{isEmailConfirmed ? "Confirmed" : "Pending"}</span></p>
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Payment: <span className="text-[#355f9b]">{isPaymentConfirmed ? "Confirmed" : "Pending"}</span></p>
                  <p className="text-[13px] font-semibold text-[#1d2f4f]">Consent: <span className="text-[#355f9b]">{resumeApplication?.consent_captured ? "Captured" : "Pending"}</span></p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const fieldClass = `${checkoutFieldClass} ${fieldDisabledClass}`;
  const fieldError = (hasError: boolean) => `${fieldClass} ${hasError ? checkoutFieldErrorClass : ""}`;

  const summaryLines = [
    {
      id: "applicant-1",
      title: watchedFullName.trim() || "Applicant 1",
      subtitle: selectedServiceLabel,
      meta: watchedEmail || undefined,
      amountLabel: selectedFeeLabel,
    },
    ...extraApplicants.map((applicant, index) => ({
      id: applicant.id,
      title: applicant.fullName.trim() || `Applicant ${index + 2}`,
      subtitle: selectedServiceLabel,
      meta: applicant.applyingFrom || undefined,
      amountLabel: selectedFeeLabel,
    })),
  ];

  return (
    <CheckoutShell
      title="Start your order"
      subtitle="Choose your visa and enter applicant details."
      currentStep={0}
      summary={
        <OrderSummaryCard
          lines={summaryLines}
          totalLabel={orderTotalLabel}
          footerNote={`${applicantCount} applicant${applicantCount > 1 ? "s" : ""} · ${selectedVisaDuration}`}
        />
      }
      form={
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-3">
          <input type="hidden" {...register("purposeOfVisit")} />
          <input type="hidden" {...register("nationality")} />

          {/* Primary applicant — same screen */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={checkoutLabelClass}>
                Name of Applicant <span className="text-[#E11D48]">*</span>
              </label>
              <input
                {...register("fullName")}
                type="text"
                disabled={isSubmitting || isReadOnlyApplication}
                readOnly={isReadOnlyApplication}
                placeholder="As on passport"
                className={fieldError(Boolean(errors.fullName))}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName ? <p className="mt-1 text-[11px] text-[#E11D48]">{errors.fullName.message}</p> : null}
            </div>

            <div>
              <label className={checkoutLabelClass}>
                Mobile Number <span className="text-[#E11D48]">*</span>
              </label>
              <div className="flex gap-2">
                <Controller
                  name="countryCode"
                  control={control}
                  render={({ field }) => (
                    <SearchableDialCode
                      value={field.value}
                      options={countryOptions}
                      loading={isCountryOptionsLoading}
                      disabled={isSubmitting || isReadOnlyApplication}
                      className={`w-[92px] shrink-0 ${fieldError(Boolean(errors.countryCode || errors.phone))}`}
                      onChange={field.onChange}
                    />
                  )}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  disabled={isSubmitting || isReadOnlyApplication}
                  readOnly={isReadOnlyApplication}
                  placeholder="10-digit mobile number"
                  className={`min-w-0 flex-1 ${fieldError(Boolean(errors.phone))}`}
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone", {
                    onChange: (event) => {
                      const next = sanitizeMobileDigits(event.target.value, 10);
                      event.target.value = next;
                      setValue("phone", next, { shouldDirty: true, shouldValidate: true });
                    },
                  })}
                />
              </div>
              {errors.countryCode ? (
                <p className="mt-1 text-[11px] text-[#E11D48]">{errors.countryCode.message}</p>
              ) : errors.phone ? (
                <p className="mt-1 text-[11px] text-[#E11D48]">{errors.phone.message}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#829AB1]">Digits only · exactly 10 numbers</p>
              )}
            </div>

            <div>
              <label className={checkoutLabelClass}>
                Email Address <span className="text-[#E11D48]">*</span>
              </label>
              <input
                {...register("email")}
                type="email"
                disabled={isSubmitting || isReadOnlyApplication || (emailAutofilled && isAuthenticated)}
                readOnly={isReadOnlyApplication || (emailAutofilled && isAuthenticated)}
                placeholder="you@email.com"
                className={`${fieldError(Boolean(errors.email))} ${emailAutofilled && isAuthenticated ? "bg-[#F0F7FF]" : ""}`}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? (
                <p className="mt-1 text-[11px] text-[#E11D48]">{errors.email.message}</p>
              ) : emailAutofilled && isAuthenticated ? (
                <p className="mt-1 text-[11px] text-[#1A56DB]">Registered email</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#829AB1]">Verification code goes here</p>
              )}
            </div>

            <div>
              <label className={checkoutLabelClass}>
                Applying From <span className="text-[#E11D48]">*</span>
              </label>
              <Controller
                name="countryOfResidence"
                control={control}
                render={({ field }) => (
                  <SearchableSelectField
                    value={field.value}
                    options={residenceOptions}
                    placeholder="Select country"
                    loading={isCountryOptionsLoading}
                    disabled={isSubmitting || isReadOnlyApplication}
                    className={fieldError(Boolean(errors.countryOfResidence || errors.nationality))}
                    onChange={(value) => {
                      field.onChange(value);
                      const nationalityMatch =
                        nationalityOptions.find((option) => option.toLowerCase() === value.toLowerCase()) ||
                        nationalityOptions.find((option) => {
                          const first = value.toLowerCase().split(" ")[0] || "";
                          return (
                            value.toLowerCase().includes(option.toLowerCase()) ||
                            (first.length > 3 && option.toLowerCase().includes(first))
                          );
                        });
                      setValue("nationality", nationalityMatch || value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  />
                )}
              />
              {(errors.countryOfResidence || errors.nationality) ? (
                <p className="mt-1 text-[11px] text-[#E11D48]">
                  {errors.countryOfResidence?.message || errors.nationality?.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Extra applicants expand on SAME screen */}
          {extraApplicants.map((applicant, index) => {
            const rowErrors = extraApplicantErrors[applicant.id] || {};
            return (
            <div
              key={applicant.id}
              className={`rounded-lg border bg-[#F8FBFF] p-3 ${
                Object.keys(rowErrors).length ? "border-[#F3A4A4]" : "border-[#D7E4F4]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#0F1F3D]">Applicant {index + 2}</p>
                <button
                  type="button"
                  onClick={() => removeExtraApplicant(applicant.id)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#E11D48]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className={checkoutLabelClass}>
                    Name <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="text"
                    value={applicant.fullName}
                    disabled={isSubmitting || isReadOnlyApplication}
                    onChange={(e) => updateExtraApplicant(applicant.id, { fullName: e.target.value })}
                    onBlur={(e) => {
                      const nextName = e.target.value;
                      const nameKey = normalizeApplicantName(nextName);
                      if (!nameKey) return;
                      const country = applicant.applyingFrom;
                      const primaryName = normalizeApplicantName(watchedFullName);
                      const matchesPrimary =
                        Boolean(primaryName) &&
                        primaryName === nameKey &&
                        sameApplyingCountry(watchedApplyingFrom, country);
                      const matchesOther = extraApplicants.some(
                        (row) =>
                          row.id !== applicant.id &&
                          normalizeApplicantName(row.fullName) === nameKey &&
                          sameApplyingCountry(row.applyingFrom, country),
                      );
                      if (matchesPrimary || matchesOther) {
                        toast.error(samePersonSameVisaMessage(nextName, country));
                      }
                    }}
                    placeholder="As on passport"
                    className={fieldError(Boolean(rowErrors.fullName))}
                  />
                  {rowErrors.fullName ? (
                    <p className="mt-1 text-[11px] text-[#E11D48]">{rowErrors.fullName}</p>
                  ) : null}
                </div>
                <div>
                  <label className={checkoutLabelClass}>
                    Mobile <span className="text-[#E11D48]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <SearchableDialCode
                      value={applicant.countryCode}
                      options={countryOptions}
                      loading={isCountryOptionsLoading}
                      disabled={isSubmitting || isReadOnlyApplication}
                      className={`w-[92px] shrink-0 ${fieldError(Boolean(rowErrors.phone))}`}
                      onChange={(value) => updateExtraApplicant(applicant.id, { countryCode: value })}
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={applicant.phone}
                      disabled={isSubmitting || isReadOnlyApplication}
                      onChange={(e) =>
                        updateExtraApplicant(applicant.id, {
                          phone: sanitizeMobileDigits(e.target.value, 10),
                        })
                      }
                      placeholder="10-digit mobile"
                      className={`min-w-0 flex-1 ${fieldError(Boolean(rowErrors.phone))}`}
                    />
                  </div>
                  {rowErrors.phone ? (
                    <p className="mt-1 text-[11px] text-[#E11D48]">{rowErrors.phone}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#829AB1]">Digits only · 10 numbers</p>
                  )}
                </div>
                <div>
                  <label className={checkoutLabelClass}>
                    Email <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="email"
                    value={applicant.email}
                    disabled={isSubmitting || isReadOnlyApplication}
                    onChange={(e) => updateExtraApplicant(applicant.id, { email: e.target.value })}
                    placeholder="email@example.com"
                    className={fieldError(Boolean(rowErrors.email))}
                  />
                  {rowErrors.email ? (
                    <p className="mt-1 text-[11px] text-[#E11D48]">{rowErrors.email}</p>
                  ) : null}
                </div>
                <div>
                  <label className={checkoutLabelClass}>
                    Applying From <span className="text-[#E11D48]">*</span>
                  </label>
                  <SearchableSelectField
                    value={applicant.applyingFrom}
                    options={residenceOptions}
                    placeholder="Select country"
                    loading={isCountryOptionsLoading}
                    disabled={isSubmitting || isReadOnlyApplication}
                    className={fieldError(Boolean(rowErrors.applyingFrom))}
                    onChange={(value) => {
                      const dialOptions = countryOptions.map((option) => ({
                        country: option.country,
                        dialCode: option.dialCode,
                        flag: option.flag || "",
                        cca2: option.cca2 || "",
                      }));
                      updateExtraApplicant(applicant.id, {
                        applyingFrom: value,
                        countryCode: dialCodeForCountryName(value, dialOptions, applicant.countryCode || defaultDialCode),
                      });
                      const nameKey = normalizeApplicantName(applicant.fullName);
                      if (nameKey) {
                        const matchesPrimary =
                          normalizeApplicantName(watchedFullName) === nameKey &&
                          sameApplyingCountry(watchedApplyingFrom, value);
                        const matchesOther = extraApplicants.some(
                          (row) =>
                            row.id !== applicant.id &&
                            normalizeApplicantName(row.fullName) === nameKey &&
                            sameApplyingCountry(row.applyingFrom, value),
                        );
                        if (matchesPrimary || matchesOther) {
                          toast.error(samePersonSameVisaMessage(applicant.fullName, value));
                        }
                      }
                    }}
                  />
                  {rowErrors.applyingFrom ? (
                    <p className="mt-1 text-[11px] text-[#E11D48]">{rowErrors.applyingFrom}</p>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}

          {!isReadOnlyApplication ? (
            <button
              type="button"
              onClick={addExtraApplicant}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1A56DB]/40 bg-[#EFF6FF] px-3 py-2 text-[13px] font-semibold text-[#1A56DB] transition hover:bg-[#DBEAFE]"
            >
              <Plus className="h-4 w-4" />
              Add Applicant
            </button>
          ) : null}

          <div>
            {!watchedApplyingFrom ? (
              <div className="rounded-lg border border-dashed border-[#D0D7E2] bg-[#F8FBFF] px-3 py-3">
                <p className="text-[14px] font-semibold text-[#334E68]">What do you need?</p>
                <p className="mt-1 text-[13px] text-[#627D98]">
                  Select <span className="font-semibold">Applying From</span> first — visa options and country prices will appear here.
                </p>
              </div>
            ) : countryVisaOptionsLoading ? (
              <div className="rounded-lg border border-[#E1E7EF] bg-white px-3 py-3 text-[13px] text-[#627D98]">
                Loading visa options for {watchedApplyingFrom}…
              </div>
            ) : countryVisaOptions.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[13px] text-amber-800">
                No e-Visa options are configured for {watchedApplyingFrom} yet. Pick another country or contact support.
              </div>
            ) : (
              <ServiceOptionList
                options={countryVisaOptions.map((option) => ({
                  id: option.id,
                  title: option.title,
                  description: option.description,
                  priceLabel: option.priceLabel,
                }))}
                value={selectedVisaOptionId || countryVisaOptions[0]?.id || ""}
                disabled={isReadOnlyApplication}
                onChange={(id) => {
                  const option = countryVisaOptions.find((row) => row.id === id);
                  if (!option) return;
                  setSelectedVisaOptionId(option.id);
                  setValue("visaDuration", option.duration, { shouldValidate: true, shouldDirty: true });
                  originOptionIdRef.current = option.originOptionId;
                  updateData({
                    visaDuration: option.duration,
                    originOptionId: option.originOptionId,
                  });
                }}
              />
            )}
          </div>
          {errors.visaDuration ? (
            <p className="-mt-1 text-[11px] text-[#E11D48]">{errors.visaDuration.message}</p>
          ) : null}

          <label className={`flex items-start gap-2 rounded-lg p-2 ${errors.consent ? "bg-[#FEF2F2]" : ""}`}>
            <input
              type="checkbox"
              {...register("consent")}
              disabled={isSubmitting || isReadOnlyApplication}
              className="mt-0.5 h-4 w-4 rounded border-[#C8D7EA] text-[#1A56DB] focus:ring-[#1A56DB]"
            />
            <span className="text-[12px] leading-snug text-[#627D98]">
              I agree to the Terms & Privacy Policy and consent to be contacted about this application.{" "}
              <span className="text-[#E11D48]">*</span>
            </span>
          </label>
          {errors.consent ? <p className="-mt-1 text-[11px] text-[#E11D48]">{errors.consent.message}</p> : null}

          <div className="flex flex-col gap-2 border-t border-[#E8EEF6] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#627D98] lg:hidden">
              Total <span className="font-bold text-[#0F1F3D]">{orderTotalLabel}</span>
            </p>
            <motion.button
              type="submit"
              disabled={isSubmitting || isReadOnlyApplication || (!isExistingCase && !canContinueWithVisa)}
              animate={hasSubmitError ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A56DB] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#1648B5] sm:ml-auto sm:w-auto sm:min-w-[160px] ${
                isSubmitting || isReadOnlyApplication || (!isExistingCase && !canContinueWithVisa)
                  ? "cursor-not-allowed bg-slate-300 text-slate-500 hover:bg-slate-300"
                  : ""
              }`}
            >
              {isReadOnlyApplication ? (
                "View application"
              ) : isExistingCase ? (
                "Save details"
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>
        </form>
      }
    />
  );
}
