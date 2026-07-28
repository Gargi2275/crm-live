import type { HubOffering } from "@/lib/api";

/** Static fallback matching migration seed — used if /countries/ is unreachable. */
export const HUB_COUNTRIES_FALLBACK = [
  {
    name: "USA",
    slug: "usa",
    cities: [
      { name: "Houston", slug: "houston" },
      { name: "New York", slug: "new-york" },
      { name: "Los Angeles", slug: "los-angeles" },
      { name: "Chicago", slug: "chicago" },
      { name: "Dallas", slug: "dallas" },
      { name: "Washington", slug: "washington" },
      { name: "Boston", slug: "boston" },
      { name: "Atlanta", slug: "atlanta" },
      { name: "Seattle", slug: "seattle" },
    ],
  },
  {
    name: "UK",
    slug: "uk",
    cities: [
      { name: "London", slug: "london" },
      { name: "Birmingham", slug: "birmingham" },
      { name: "Manchester", slug: "manchester" },
      { name: "Edinburgh", slug: "edinburgh" },
      { name: "Leicester", slug: "leicester" },
      { name: "Luton", slug: "luton" },
      { name: "Coventry", slug: "coventry" },
      { name: "Bradford", slug: "bradford" },
      { name: "Scotland", slug: "scotland" },
    ],
  },
  { name: "India", slug: "india", cities: [] as { name: string; slug: string }[] },
  {
    name: "Canada",
    slug: "canada",
    cities: [
      { name: "Ontario", slug: "ontario" },
      { name: "Vancouver", slug: "vancouver" },
      { name: "Calgary", slug: "calgary" },
      { name: "Ottawa", slug: "ottawa" },
    ],
  },
  { name: "Dubai", slug: "dubai", cities: [] },
  { name: "New Zealand", slug: "new-zealand", cities: [] },
  { name: "Mauritius", slug: "mauritius", cities: [] },
  {
    name: "Australia",
    slug: "australia",
    cities: [
      { name: "Melbourne", slug: "melbourne" },
      { name: "Sydney", slug: "sydney" },
    ],
  },
  { name: "Malaysia", slug: "malaysia", cities: [] },
  { name: "Singapore", slug: "singapore", cities: [] },
  { name: "Germany", slug: "germany", cities: [] },
  { name: "Ireland", slug: "ireland", cities: [] },
  { name: "Netherlands", slug: "netherlands", cities: [] },
] as const;

export function formatHubMoney(symbol: string, amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return `${symbol}${amount}`;
  }
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${symbol}${formatted}`;
}

export function buildHubApplyHref(opts: {
  serviceType: string;
  countrySlug: string;
  citySlug?: string | null;
}): string {
  const serviceType = (opts.serviceType || "").trim().toLowerCase();

  if (serviceType.startsWith("evisa")) {
    return "/indian-e-visa";
  }
  if (serviceType === "express") {
    return "/services";
  }

  const params = new URLSearchParams({
    start: "1",
    service: opts.serviceType,
    country: opts.countrySlug,
  });
  if (opts.citySlug) {
    params.set("city", opts.citySlug);
  }
  return `/dashboard/document-audit?${params.toString()}`;
}

export function shortDescription(text: string, max = 110): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Expert document preparation and guided filing support.";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function totalFeeNumber(offering: HubOffering): number {
  const total = Number(offering.total_fee);
  if (Number.isFinite(total)) return total;
  const govt = Number(offering.govt_fee || 0);
  const service = Number(offering.service_fee || 0);
  return (Number.isFinite(govt) ? govt : 0) + (Number.isFinite(service) ? service : 0);
}
