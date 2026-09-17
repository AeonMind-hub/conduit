import { cookies } from "next/headers";
import OpsClient from "./OpsClient";
import { COOKIE_NAME, rebuild, wireOrSeed } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  return <OpsClient initial={rebuild(wireOrSeed(jar.get(COOKIE_NAME)?.value))} />;
}
