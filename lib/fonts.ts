import { Roboto } from "next/font/google";

/**
 * Visament uses: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif.
 * Roboto is the cross-platform match we can load via next/font.
 */
export const siteSans = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  variable: "--font-sans",
});

/** @deprecated Alias kept so existing imports keep working — same family as siteSans. */
export const siteHeading = siteSans;
