import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";

import { getLiturgicalSeason } from "@/lib/liturgical";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Newsreader is a variable font with real optical sizing, which is most of why
 * the headings read as typeset rather than merely "a serif".
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Catholic Crisis Relief — Give where it is needed most",
    template: "%s · Catholic Crisis Relief",
  },
  description:
    "Emergency appeals for communities facing conflict, famine and disaster — with a published ledger showing exactly where every donation went.",
  openGraph: {
    type: "website",
    siteName: "Catholic Crisis Relief",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
  ],
};

/**
 * Applies a saved theme preference before first paint. Without this the page
 * flashes the system theme for a frame when a reader has chosen the other one.
 */
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem("theme");
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Computed server-side so the season tint is correct on the first paint.
  const season = getLiturgicalSeason();

  return (
    <html
      lang="en"
      data-season={season}
      className={`${inter.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader season={season} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
