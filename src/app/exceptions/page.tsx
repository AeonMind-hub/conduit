import ExceptionsClient from "./ExceptionsClient";
import { readStore } from "@/lib/store";
export const dynamic = "force-dynamic";
export default function Page() { return <ExceptionsClient initial={readStore()} />; }
