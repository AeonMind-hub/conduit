import { NextResponse } from "next/server";
import { COOKIE_NAME, rebuild, wireOrSeed } from "@/lib/session";

export const dynamic = "force-dynamic";

const read = (req: Request) =>
  rebuild(wireOrSeed(req.headers.get("cookie")?.match(/conduit_s=([^;]+)/)?.[1]));

export async function GET(req: Request) {
  return NextResponse.json(read(req));
}
