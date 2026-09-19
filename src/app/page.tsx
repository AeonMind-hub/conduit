import Machine from "@/components/Machine";

/**
 * One screen, one job: a document goes in, a row comes out. Deliberately `force-dynamic` and free of
 * any per-visitor state — there is nothing to look up, because nothing is kept.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return <Machine />;
}
