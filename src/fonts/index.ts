import localFont from "next/font/local";

/**
 * Galano Grotesque Alt — same family used on the institutional site.
 * Only display weights (200/700/800/900) are licensed for this project;
 * body copy falls back to the system sans stack, matching the site's
 * own `"Galano Grotesque Alt", system-ui, sans-serif` stack.
 */
export const galano = localFont({
  src: [
    { path: "./GalanoGrotesqueAlt-ExtraLight.otf", weight: "200", style: "normal" },
    { path: "./GalanoGrotesqueAlt-ExtraLightItalic.otf", weight: "200", style: "italic" },
    { path: "./GalanoGrotesqueAlt-Bold.otf", weight: "700", style: "normal" },
    { path: "./GalanoGrotesqueAlt-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "./GalanoGrotesqueAlt-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "./GalanoGrotesqueAlt-ExtraBoldItalic.otf", weight: "800", style: "italic" },
    { path: "./GalanoGrotesqueAlt-Black.otf", weight: "900", style: "normal" },
    { path: "./GalanoGrotesqueAlt-BlackItalic.otf", weight: "900", style: "italic" },
  ],
  variable: "--font-galano",
  fallback: ["system-ui", "sans-serif"],
  display: "swap",
});
