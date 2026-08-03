import OpsClient from "./OpsClient";
import { readStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export default function Page() { return <OpsClient initial={readStore()} />; }
