import { notFound } from "next/navigation";
import { LocationHubPage } from "@/components/location-hub/LocationHubPage";
import { getCityHubServices, getHubCountries } from "@/lib/api";
import { HUB_COUNTRIES_FALLBACK } from "@/lib/location-hub";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ country: string; city: string }> | { country: string; city: string };
};

async function resolveParams(params: PageProps["params"]) {
  return typeof (params as Promise<{ country: string; city: string }>).then === "function"
    ? await (params as Promise<{ country: string; city: string }>)
    : (params as { country: string; city: string });
}

export async function generateStaticParams() {
  try {
    const countries = await getHubCountries();
    if (countries.length) {
      return countries.flatMap((country) =>
        (country.cities || []).map((city) => ({
          country: country.slug,
          city: city.slug,
        })),
      );
    }
  } catch {
    /* fall through */
  }
  return HUB_COUNTRIES_FALLBACK.flatMap((country) =>
    country.cities.map((city) => ({
      country: country.slug,
      city: city.slug,
    })),
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { country: countrySlug, city: citySlug } = await resolveParams(params);
  try {
    const data = await getCityHubServices(countrySlug, citySlug);
    const location = data.city.name;
    return buildPageMetadata({
      title: `Apply Online Indian Consular Services for NRI's in ${location}`,
      description: `Indian consular services for NRIs in ${location}, ${data.country.name}. Fees shown in ${data.country.currency_code}.`,
      path: `/service/${data.country.slug}/${data.city.slug}`,
    });
  } catch {
    return buildPageMetadata({
      title: `Indian Consular Services — ${citySlug}`,
      description: "Apply online for Indian consular services with FlyOCI.",
      path: `/service/${countrySlug}/${citySlug}`,
    });
  }
}

export default async function CityServiceHubPage({ params }: PageProps) {
  const { country: countrySlug, city: citySlug } = await resolveParams(params);

  let data;
  try {
    data = await getCityHubServices(countrySlug, citySlug);
  } catch {
    notFound();
  }

  return (
    <LocationHubPage
      country={data.country}
      city={data.city}
      offerings={data.offerings}
    />
  );
}
