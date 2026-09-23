import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Chrome } from "@/components/Chrome";
import { CLIENT_NAME, DEMO_URL, TAGLINE, INTAKE_ADDRESS } from "@/lib/config";

/*
  Three voices, self-hosted, and that is the whole typographic system:
  a serif for anything said out loud, a humanist sans for instructions, a monospace for every figure
  so that numbers in a column line up on their decimal places.

  They are shipped as first-party woff2 rather than pulled from a font CDN: the demo gets opened on
  a phone, on a warehouse wifi, from a link in Slack, and a third-party round trip is a second of
  blank typography between a prospect's click and the page looking like something worth paying for.
*/
const display = localFont({
  src: [
    { path: "./fonts/newsreader.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/newsreader-2.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const text = localFont({
  src: [{ path: "./fonts/plex-sans.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-text",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const mono = localFont({
  src: [
    { path: "./fonts/plex-mono-1.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-mono-2.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-mono-3.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

/*
  The <title> and the social card are the first two lines of the pitch — they are what shows in the
  Slack preview when a prospect pastes the link around, which is the moment that decides whether
  anyone clicks. So they describe the product and the client's situation; the disclosure that the
  data is a sample corpus is on the page itself, in one place.
*/
export const metadata: Metadata = {
  title: `Conduit · ${CLIENT_NAME} — paste a document, get a clean row`,
  description:
    "Orders, invoices and booking notes arrive as text or PDF. Every field your systems need is read "
    + "out of the document, checked the way your systems will check it, and routed. Anything it cannot "
    + "verify it holds and tells you why, instead of writing a guess.",
  openGraph: {
    title: `Conduit · ${CLIENT_NAME}`,
    description: "Run your own paperwork through it. See what it reads, and what it refuses to invent.",
    url: DEMO_URL,
  },
  twitter: { card: "summary_large_image", title: `Conduit · ${CLIENT_NAME}`,
    description: "Your orders, invoices and goods-received notes, checked against each other. "
      + "Anything it cannot verify it holds and tells you why." },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2efe6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="record"
          className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <body>
        {/* Chrome is the frame — nameplate, measure, footer. A page was once rendered as bare text
            flush against the viewport edge because a frame went missing while this file was rewritten,
            so it lives here, where there is exactly one place for it to be wrong. */}
        <Chrome>{children}</Chrome>
        <Analytics />
      </body>
    </html>
  );
}
