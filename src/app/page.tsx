import Machine from "@/components/Machine";

/**
 * One screen, one job: a document goes in, a row comes out. Deliberately `force-dynamic` and free of
 * any per-visitor state — there is nothing to look up, because nothing is kept.
 *
 * Corpus numbers (88% / 96% / 75 documents) deliberately do NOT live here — `scripts/verify.mjs` has
 * a standing check ("no stats theatre on the landing page") that fails the build if they appear. That
 * was a real, tested decision from the last redesign, not an oversight: the page proves itself by
 * running a document, not by quoting a stat about documents it already ran. Those numbers stay in the
 * README and the outreach message, where a human reads them.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return <Machine />;
}
