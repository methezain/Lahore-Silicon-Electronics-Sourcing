/**
 * Runs Lighthouse CI, then the above-the-fold image check.
 * Exits with a failure if either one fails.
 */
import { spawnSync } from "node:child_process";

const assert = spawnSync("npx", ["lhci", "autorun"], { stdio: "inherit", shell: true });
const images = spawnSync("node", ["scripts/check-atf-images.mjs"], { stdio: "inherit", shell: true });
process.exit(assert.status || images.status || 0);
