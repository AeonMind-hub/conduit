import { cookies } from "next/headers";
import RecordsClient from "./RecordsClient";
import { COOKIE_NAME, rebuild, wireOrSeed } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  return <RecordsClient initial={rebuild(wireOrSeed(jar.get(COOKIE_NAME)?.value))} />;
}
