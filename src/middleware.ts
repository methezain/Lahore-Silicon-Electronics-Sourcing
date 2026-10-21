import { defineMiddleware } from "astro:middleware";
import { secureResponse } from "./lib/security-headers";

export const onRequest = defineMiddleware(async (_context, next) => {
  return secureResponse(await next());
});
