import { notFound } from "next/navigation";
import { LocationHubPage } from "@/components/location-hub/LocationHubPage";
import { getCountryHubServices, getHubCountries } from "@/lib/api";
import { HUB_COUNTRIES_FALLBACK } from "@/lib/location-hub";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ country: string }> | { country: string };
};

async function resolveParams(params: PageProps["params"]) {
  return typeof (params as Promise<{ country: string }>).then === "function"
    ? await (params as Promise<{ country: string }>)
    : (params as { country: string });
}

export async function generateStaticParams() {
  try {
    const countries = await getHubCountries();
    if (countries.length) {
      return countries.map((c) => ({ country: c.slug }));
    }
  } catch {
    /* fall through */
  }
  return HUB_COUNTRIES_FALLBACK.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { country: countrySlug } = await resolveParams(params);
  try {
    const data = await getCountryHubServices(countrySlug);
    const location = data.country.name;
    return buildPageMetadata({
      title: `Apply Online Indian Consular Services for NRI's in ${location}`,
      description: `OCI, passport, and related Indian consular services for NRIs in ${location}. Clear fees in ${data.country.currency_code}.`,
      path: `/service/${data.country.slug}`,
    });
  } catch {
    return buildPageMetadata({
      title: `Indian Consular Services — ${countrySlug}`,
      description: "Apply online for Indian consular services with FlyOCI.",
      path: `/service/${countrySlug}`,
    });
  }
}

export default async function CountryServiceHubPage({ params }: PageProps) {
  const { country: countrySlug } = await resolveParams(params);

  let data;
  try {
    data = await getCountryHubServices(countrySlug);
  } catch {
    notFound();
  }

  return (
    <LocationHubPage
      country={data.country}
      cities={data.cities}
      offerings={data.offerings}
    />
  );
}
