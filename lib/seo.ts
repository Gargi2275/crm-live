import type { Metadata } from "next";

export const SITE_NAME = "FlyOCI";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://flyoci.com").replace(/\/$/, "");
export const SITE_TAGLINE = "OCI, Indian e-Visa, Apostille & Passport Services for UK & US Residents";
export const DEFAULT_OG_IMAGE = "/logo.png";

/** Core brand + service keywords for Google and on-site discovery */
export const DEFAULT_KEYWORDS = [
  "FlyOCI",
  "flyoci",
  "flyoci.com",
  "OCI card UK",
  "OCI card US",
  "OCI application UK",
  "OCI application help",
  "OCI renewal UK",
  "OCI transfer new passport",
  "new OCI card",
  "OCI update gratis",
  "Indian e-Visa UK",
  "Indian e-Visa US",
  "India e visa application",
  "Indian e visa online",
  "OCI evisa",
  "OCI apostille",
  "apostille OCI documents",
  "Indian passport renewal UK",
  "Indian passport renewal US",
  "apostille services UK",
  "apostille India documents",
  "document apostille UK",
  "birth certificate apostille UK",
  "Indian visa services",
  "VFS OCI help",
  "Overseas Citizen of India",
  "OCI card application service",
  "Indian consulate document help",
];

export type PageSeoConfig = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function absoluteUrl(path: string = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(config: PageSeoConfig): Metadata {
  const title = config.title.includes(SITE_NAME) ? config.title : `${config.title} | ${SITE_NAME}`;
  const url = absoluteUrl(config.path);
  const keywords = [...new Set([...(config.keywords || []), ...DEFAULT_KEYWORDS])];
  const ogImage = absoluteUrl(DEFAULT_OG_IMAGE);

  return {
    title,
    description: config.description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: config.description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: config.description,
      images: [ogImage],
    },
    robots: config.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "FlyOCI helps UK and US residents with OCI card applications, OCI renewal, Indian e-Visa, apostille services, and passport renewal. Independent guidance — not a government website.",
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Immigration & Visa Services",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description:
      "Expert OCI, Indian e-Visa, apostille and passport support for UK & US residents. Form filling and end-to-end application guidance.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | OCI, e-Visa & Apostille Services`,
    description: "OCI, Indian e-Visa, apostille & passport services for UK & US residents.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    // Add tokens when available: google: "...", yandex: "..."
  },
};
