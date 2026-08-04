import { cookies } from "next/headers";
import ExceptionsClient from "./ExceptionsClient";
import { COOKIE_NAME, decodeWire, rebuild } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  return <ExceptionsClient initial={rebuild(decodeWire(jar.get(COOKIE_NAME)?.value))} />;
}
