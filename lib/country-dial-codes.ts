export type CountryDialOption = {
  country: string;
  dialCode: string;
  flag: string;
  cca2: string;
};

/** Prefer world-countries CDN — restcountries v3 redirects / errors. */
export const COUNTRIES_API_URL =
  "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json";

const APPLYING_FROM_ALIASES: Record<string, string> = {
  UAE: "United Arab Emirates",
  "United Kingdom": "United Kingdom",
  "United States": "United States",
  Canada: "Canada",
  Australia: "Australia",
  Other: "United Kingdom",
};

function flagFromCountryCode(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...Array.from(code).map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function extractCountryDialOptions(
  data: Array<{
    name?: { common?: string };
    idd?: { root?: string; suffixes?: string[] };
    flag?: string;
    cca2?: string;
  }>,
): CountryDialOption[] {
  return data
    .filter((country) => Boolean(country.idd?.root))
    .map((country) => ({
      country: country.name?.common?.trim() || "",
      dialCode: `${country.idd?.root || ""}${
        country.idd?.suffixes?.length === 1 ? country.idd.suffixes[0] : ""
      }`.trim(),
      flag: country.flag || flagFromCountryCode(country.cca2 || ""),
      cca2: country.cca2 || "",
    }))
    .filter((entry) => Boolean(entry.country && entry.dialCode && entry.dialCode.startsWith("+")))
    .sort((left, right) => left.country.localeCompare(right.country));
}

export async function fetchCountryDialOptions(): Promise<CountryDialOption[]> {
  const response = await fetch(COUNTRIES_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to load countries (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? extractCountryDialOptions(payload) : [];
}

export function dialCodeForCountryName(
  countryName: string,
  options: CountryDialOption[],
  fallback = "+44",
): string {
  const alias = APPLYING_FROM_ALIASES[countryName] || countryName;
  const match =
    options.find((row) => row.country === alias) ||
    options.find((row) => row.country.toLowerCase() === alias.toLowerCase());
  return match?.dialCode || fallback;
}

/** Map Applying From country name → pricing country slug used by hub overrides. */
export function pricingSlugFromCountryName(countryName: string): string {
  const raw = (countryName || "").trim();
  if (!raw) return "";
  const alias = APPLYING_FROM_ALIASES[raw] || raw;
  const key = alias.toLowerCase();
  const map: Record<string, string> = {
    "united states": "usa",
    "united states of america": "usa",
    us: "usa",
    usa: "usa",
    "united kingdom": "uk",
    uk: "uk",
    "great britain": "uk",
    canada: "canada",
    australia: "australia",
    uae: "uae",
    "united arab emirates": "uae",
    india: "india",
  };
  if (map[key]) return map[key];
  return key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Static fallback if CDN is unavailable. */
export const FALLBACK_DIAL_OPTIONS: CountryDialOption[] = [
  { country: "United Kingdom", dialCode: "+44", flag: "🇬🇧", cca2: "GB" },
  { country: "United States", dialCode: "+1", flag: "🇺🇸", cca2: "US" },
  { country: "Canada", dialCode: "+1", flag: "🇨🇦", cca2: "CA" },
  { country: "Australia", dialCode: "+61", flag: "🇦🇺", cca2: "AU" },
  { country: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", cca2: "AE" },
  { country: "India", dialCode: "+91", flag: "🇮🇳", cca2: "IN" },
  { country: "Ireland", dialCode: "+353", flag: "🇮🇪", cca2: "IE" },
  { country: "Singapore", dialCode: "+65", flag: "🇸🇬", cca2: "SG" },
];
