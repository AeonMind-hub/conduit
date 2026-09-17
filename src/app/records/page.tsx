import RecordsClient from "./RecordsClient";
import { visitorState } from "@/lib/wire-http";

export const dynamic = "force-dynamic";

/** One derivation of visitor state, in one module, shared with the API routes. */
export default async function Page() {
  const { store } = await visitorState();
  return <RecordsClient initial={store} />;
}
