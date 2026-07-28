import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from "@/lib/seo";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/logo.png"),
  description: SITE_TAGLINE,
  areaServed: ["United Kingdom", "United States"],
  knowsAbout: [
    "OCI card application",
    "OCI renewal",
    "Indian e-Visa",
    "Apostille services",
    "Indian passport renewal",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: absoluteUrl("/contact"),
    availableLanguage: ["English"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_TAGLINE,
  inLanguage: "en-GB",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
};

const servicesJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${SITE_NAME} Services`,
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "New OCI Card", url: absoluteUrl("/services/new-oci") },
    { "@type": "ListItem", position: 2, name: "OCI Renewal", url: absoluteUrl("/services/oci-renewal") },
    { "@type": "ListItem", position: 3, name: "OCI Update", url: absoluteUrl("/services/oci-update") },
    { "@type": "ListItem", position: 4, name: "Indian e-Visa", url: absoluteUrl("/services/indian-evisa") },
    { "@type": "ListItem", position: 5, name: "Indian Passport Renewal", url: absoluteUrl("/services/passport-renewal") },
    { "@type": "ListItem", position: 6, name: "Apostille Services", url: absoluteUrl("/apostille-services") },
  ],
};

export function SiteJsonLd() {
  const blocks = [organizationJsonLd, websiteJsonLd, servicesJsonLd];

  return (
    <>
      {blocks.map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
