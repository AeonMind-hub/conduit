import type { Metadata } from "next";
import "./globals.css";
import ShellWrap from "@/components/ShellWrap";
import { CLIENT_NAME, DEMO_URL, TAGLINE, INTAKE_ADDRESS } from "@/lib/config";

/*
  The <title> and the social card are the first two lines of the pitch — they are what shows in
  the Slack preview when a prospect pastes the link around, which is the moment that actually
  decides whether anyone clicks. So they describe the product and the client's situation, and the
  disclosure that the data is a sample corpus lives in the rail of the app and in the README.
*/
export const metadata: Metadata = {
  title: `Conduit · ${CLIENT_NAME} — ${TAGLINE}`,
  description:
    "Inbound documents are classified, extracted, validated and written to the systems of record. "
    + "Anything that cannot be verified is held for a human and never guessed. "
    + `Intake ${INTAKE_ADDRESS} · sample corpus of 75 documents.`,
  openGraph: {
    title: `Conduit · ${CLIENT_NAME} — ${TAGLINE}`,
    description: "75 documents land in the right system. Three are held for a human, on purpose.",
    url: DEMO_URL,
  },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-txt antialiased">
        <ShellWrap>{children}</ShellWrap>
      </body>
    </html>
  );
}
