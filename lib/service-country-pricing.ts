"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export type HubCountryOption = {
  id: number;
  name: string;
  slug: string;
};

export type ServicePricePayload = {
  service_id: number;
  service_type: string;
  service_name: string;
  country: string;
  country_name: string;
  base_fee: string;
  service_fee: string;
  audit_fee: string;
  total_fee: string;
  source: "country_override" | "base" | string;
  currency: string;
};

const PRICING_COUNTRY_KEY = "flyoci_pricing_country_slug";

export function getStoredPricingCountrySlug(): string {
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(PRICING_COUNTRY_KEY) || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function setStoredPricingCountrySlug(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const value = (slug || "").trim().toLowerCase();
    if (value) window.localStorage.setItem(PRICING_COUNTRY_KEY, value);
    else window.localStorage.removeItem(PRICING_COUNTRY_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchHubCountries(): Promise<HubCountryOption[]> {
  const response = await fetch(`${API_BASE_URL}/countries/`, { method: "GET" });
  if (!response.ok) return [];
  const raw = await response.json();
  const countries = raw?.data?.countries || raw?.countries || [];
  if (!Array.isArray(countries)) return [];
  return countries
    .map((row: { id?: number; name?: string; slug?: string }) => ({
      id: Number(row.id) || 0,
      name: String(row.name || ""),
      slug: String(row.slug || "").toLowerCase(),
    }))
    .filter((row: HubCountryOption) => row.id > 0 && row.slug);
}

export async function resolveServiceIdByType(serviceType: string): Promise<number | null> {
  const key = (serviceType || "").trim().toLowerCase();
  if (!key) return null;
  const response = await fetch(`${API_BASE_URL}/services/`, { method: "GET" });
  if (!response.ok) return null;
  const raw = await response.json();
  const list = raw?.data || raw;
  const rows = Array.isArray(list) ? list : list?.services || [];
  const match = rows.find(
    (row: { service_type?: string; id?: number }) =>
      String(row.service_type || "").toLowerCase() === key,
  );
  return match?.id ? Number(match.id) : null;
}

export async function fetchServicePrice(
  serviceId: number,
  countrySlug?: string,
): Promise<ServicePricePayload | null> {
  if (!serviceId) return null;
  const params = new URLSearchParams();
  if (countrySlug) params.set("country", countrySlug);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/services/${serviceId}/price/${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  if (!response.ok) return null;
  const raw = await response.json();
  return (raw?.data || raw) as ServicePricePayload;
}

export function formatGbpAmount(value: string | number | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `£${num.toFixed(num % 1 === 0 ? 0 : 2)}`;
}

export function useServiceCountryPricing(serviceType?: string) {
  const [countries, setCountries] = useState<HubCountryOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [countrySlug, setCountrySlug] = useState("");
  const [price, setPrice] = useState<ServicePricePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(serviceType));

  useEffect(() => {
    if (!serviceType) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [hubCountries, id] = await Promise.all([
        fetchHubCountries(),
        resolveServiceIdByType(serviceType),
      ]);
      if (cancelled) return;
      setCountries(hubCountries);
      setServiceId(id);
      const stored = getStoredPricingCountrySlug();
      const initial =
        stored && hubCountries.some((row) => row.slug === stored)
          ? stored
          : hubCountries[0]?.slug || "";
      setCountrySlug(initial);
      if (id) {
        const resolved = await fetchServicePrice(id, initial || undefined);
        if (!cancelled) setPrice(resolved);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    (async () => {
      const resolved = await fetchServicePrice(serviceId, countrySlug || undefined);
      if (!cancelled) setPrice(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, countrySlug]);

  const onCountryChange = (slug: string) => {
    const next = (slug || "").trim().toLowerCase();
    setCountrySlug(next);
    setStoredPricingCountrySlug(next);
  };

  return {
    countries,
    serviceId,
    countrySlug,
    price,
    loading,
    onCountryChange,
  };
}
