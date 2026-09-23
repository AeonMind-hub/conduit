// Cross-platform launcher for offline demo mode.
//   npm run demo
// Uses pre-computed fixtures instead of calling Gemini. No network needed.
import { spawn } from "node:child_process";

console.log("\n  OFFLINE DEMO MODE — using fixtures, no API calls\n");

spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, OFFLINE_DEMO: "1" },
});
