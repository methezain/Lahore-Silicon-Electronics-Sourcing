// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { fileURLToPath } from 'node:url';

/** @type {() => import('astro').AstroIntegration} */
const intent = () => ({
  name: 'client-intent',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) => {
      addClientDirective({ name: 'intent', entrypoint: fileURLToPath(new URL('./src/directives/intent.js', import.meta.url)) });
    },
  },
});

/** Glyphs actually present in the vendored Mona Sans file. U+00B5 and U+03A9 are absent. */
/** @type {[string, ...string[]]} */
const monaUnicodeRange = [
  "U+0020-007E",
  "U+00A0-00AC",
  "U+00AE-00B4",
  "U+00B6-00FF",
  "U+0102",
  "U+0131",
  "U+0152-0153",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0300-0301",
  "U+0303-0304",
  "U+0308-0309",
  "U+0323",
  "U+2013-2014",
  "U+2018-201A",
  "U+201C-201E",
  "U+2022",
  "U+2026",
  "U+2039-203A",
  "U+2044",
  "U+20AC",
  "U+2122",
  "U+2191",
  "U+2193",
  "U+2212",
];

/** Latin plus –, ·, ×, µ, Ω, °, and curly quotes. */
/** @type {[string, ...string[]]} */
const geistUnicodeRange = [
  "U+0020-007E",
  "U+00A0-00AC",
  "U+00AE-00FF",
  "U+0131",
  "U+0152-0153",
  "U+02BC",
  "U+02C6",
  "U+02DA",
  "U+02DC",
  "U+0304",
  "U+0308",
  "U+03A9",
  "U+03BC",
  "U+2013-2014",
  "U+2018-201A",
  "U+201C-201E",
  "U+2020-2022",
  "U+2026",
  "U+2028-2029",
  "U+2030",
  "U+2032-2033",
  "U+2039-203A",
  "U+2044",
  "U+20AC",
  "U+2122",
  "U+2191",
  "U+2193",
  "U+2212",
];

// https://astro.build/config
export default defineConfig({
  site: 'https://lahoresilicon.com',
  output: 'server',
  // Hover prefetch where Speculation Rules are unavailable. Product links opt in.
  prefetch: {
    defaultStrategy: 'hover',
  },
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
      ],
    },
  },
  vite: {
    resolve: {
      dedupe: ['zod'],
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@astrojs/cloudflare', '@astrojs/preact', 'preact']
    },
    server: {
      watch: {
        ignored: ['**/.astro/**', '**/.wrangler/**', '**/.lighthouseci/**', '**/worker-configuration.d.ts']
      }
    }
  },

  integrations: [
    preact(),
    intent(),
    sitemap({
      filter: (page) => !page.includes("/dev/") && !page.includes("/404") && !page.includes("/500") && !page.includes("/api/") && !page.includes("/admin") && !page.includes("sitemap-products"),
    }),
  ],
  adapter: cloudflare({
    imageService: "cloudflare-binding",
  }),
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Mona Sans",
      cssVariable: "--font-mona",
      fallbacks: ["sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/mona-sans-latin.woff2"],
            weight: "200 900",
            style: "normal",
            stretch: "75% 125%",
            display: "swap",
            unicodeRange: monaUnicodeRange,
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Geist Mono",
      cssVariable: "--font-geist-mono",
      fallbacks: ["monospace"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/geist-mono-latin.woff2"],
            weight: "100 900",
            style: "normal",
            display: "swap",
            unicodeRange: geistUnicodeRange,
          },
        ],
      },
    },
  ],
});