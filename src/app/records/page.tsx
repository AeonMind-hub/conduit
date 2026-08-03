import RecordsClient from "./RecordsClient";
import { readStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export default function Page() { return <RecordsClient initial={readStore()} />; }
