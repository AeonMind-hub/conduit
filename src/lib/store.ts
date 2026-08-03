import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Store } from "./types";
import { emptyStore } from "./types";

/**
 * Storage that survives serverless.
 *
 * Vercel's filesystem is READ-ONLY except for /tmp, so writing to ./.data
 * throws EROFS in production. We therefore:
 *   1. keep a module-level cache (fast, and the only thing that works on a
 *      warm lambda), and
 *   2. persist to os.tmpdir() in production, ./.data locally.
 *
 * A cold start resets the demo, which is the correct behaviour anyway —
 * every visitor should land on an empty pipeline and press Run themselves.
 */
const DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "conduit")
  : path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "store.json");

let cache: Store | null = null;

export function readStore(): Store {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
      return cache!;
    }
  } catch { /* fall through to empty */ }
  cache = emptyStore();
  return cache;
}

export function writeStore(s: Store): void {
  cache = s;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s));
  } catch {
    /* read-only filesystem — the in-memory cache still serves this instance */
  }
}

export function resetStore(): Store {
  const s = emptyStore();
  writeStore(s);
  return s;
}
