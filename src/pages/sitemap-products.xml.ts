import type { APIRoute } from "astro";
import { getProducts } from "../lib/catalog-db";

export const prerender = false;

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async ({ site, url }) => {
  const origin = (site ?? url).origin;
  const products = await getProducts();
  const entries = products
    .map((product) => `<url><loc>${escape(`${origin}/product/${product.part_number.toLowerCase()}`)}</loc></url>`)
    .join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
};
