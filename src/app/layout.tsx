import type { Metadata } from "next";
import "./globals.css";
import ShellWrap from "@/components/ShellWrap";

export const metadata: Metadata = {
  title: "Conduit — document intake",
  description: "Classifies, extracts, validates and routes inbound business documents.",
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
