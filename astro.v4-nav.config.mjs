import { fileURLToPath } from "node:url";
import config from "./astro.config.mjs";

const cacheDir = fileURLToPath(new URL("./node_modules/.vite-v4-nav/", import.meta.url));

export default {
  ...config,
  vite: {
    ...config.vite,
    cacheDir,
  },
};
