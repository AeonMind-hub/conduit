import type { Metadata } from "next";
import "./globals.css";
import ShellWrap from "@/components/ShellWrap";
import { CLIENT_NAME, DEMO_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: `Conduit — document intake · ${CLIENT_NAME}`,
  description: "Classifies inbound documents, extracts the fields each type needs, validates them and "
    + "routes to the right system. Anything it cannot verify is held for a human, never guessed. "
    + "Synthetic demo corpus — " + DEMO_URL,
  openGraph: {
    title: `Conduit — document intake · ${CLIENT_NAME}`,
    description: "Watch 75 documents land in the right system. Three held for a human on purpose.",
    url: DEMO_URL,
  },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ShellWrap>{children}</ShellWrap>
      </body>
    </html>
  );
}
