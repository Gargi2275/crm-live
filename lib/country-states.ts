/** Country → state helpers for questionnaire Country dropdowns (API-backed). */

import { API_BASE_URL } from "@/lib/config";

/** Suggested countries for admin pickers — not auto-applied to new questions. */
export const DEFAULT_COUNTRY_OPTIONS = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "India",
  "United Arab Emirates",
  "Germany",
  "Singapore",
  "New Zealand",
  "Ireland",
  "Netherlands",
  "Malaysia",
  "Mauritius",
] as const;

const statesCache = new Map<string, string[]>();
const countriesCache: { value: string[] | null } = { value: null };
const inflightStates = new Map<string, Promise<string[]>>();

function normalizeCountryKey(country: string): string {
  return (country || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function aliasCountry(country: string): string {
  const key = normalizeCountryKey(country);
  if (!key) return "";
  if (key === "uk" || key === "great britain" || key === "britain" || key === "england") {
    return "United Kingdom";
  }
  if (key === "us" || key === "u.s." || key === "u.s.a." || key === "usa" || key === "america") {
    return "United States";
  }
  if (key === "uae" || key === "dubai") return "United Arab Emirates";
  return (country || "").trim();
}

async function parseCountriesPayload(raw: unknown): Promise<string[]> {
  const data = (raw as { data?: { countries?: string[] } })?.data || (raw as { countries?: string[] });
  const list = Array.isArray(data?.countries) ? data.countries : [];
  return list.map((item) => String(item || "").trim()).filter(Boolean);
}

async function parseStatesPayload(raw: unknown): Promise<string[]> {
  const data = (raw as { data?: { states?: string[] } })?.data || (raw as { states?: string[] });
  const list = Array.isArray(data?.states) ? data.states : [];
  return list.map((item) => String(item || "").trim()).filter(Boolean);
}

export async function fetchGeoCountries(): Promise<string[]> {
  if (countriesCache.value) return countriesCache.value;
  try {
    const response = await fetch(`${API_BASE_URL}/public/geo/countries/`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to load countries");
    const raw = await response.json();
    const countries = await parseCountriesPayload(raw);
    countriesCache.value = countries.length ? countries : [...DEFAULT_COUNTRY_OPTIONS];
    return countriesCache.value;
  } catch {
    countriesCache.value = [...DEFAULT_COUNTRY_OPTIONS];
    return countriesCache.value;
  }
}

export async function fetchStatesForCountry(country: string): Promise<string[]> {
  const resolved = aliasCountry(country);
  const key = normalizeCountryKey(resolved);
  if (!key) return [];
  if (statesCache.has(key)) return statesCache.get(key) || [];

  const existing = inflightStates.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/public/geo/countries/${encodeURIComponent(resolved)}/states/`,
        { method: "GET", cache: "no-store" },
      );
      if (!response.ok) {
        statesCache.set(key, []);
        return [];
      }
      const raw = await response.json();
      const states = await parseStatesPayload(raw);
      statesCache.set(key, states);
      return states;
    } catch {
      statesCache.set(key, []);
      return [];
    } finally {
      inflightStates.delete(key);
    }
  })();

  inflightStates.set(key, promise);
  return promise;
}

/** Sync read from cache only (empty until fetchStatesForCountry has resolved). */
export function getStatesForCountry(country: string): string[] {
  const key = normalizeCountryKey(aliasCountry(country));
  if (!key) return [];
  return statesCache.get(key) || [];
}

/** Answer key used for the auto state/region field paired with a country question. */
export function countryStateAnswerKey(questionCode: string): string {
  return `${questionCode}_state`;
}

export function isCountryQuestionType(type: string | undefined | null): boolean {
  return String(type || "").trim().toLowerCase() === "country";
}
