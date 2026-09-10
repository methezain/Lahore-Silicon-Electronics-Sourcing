// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://lahoresilicon.com',
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@astrojs/cloudflare', '@astrojs/preact', 'preact']
    },
    server: {
      watch: {
        ignored: ['**/.astro/**', '**/.wrangler/**', '**/worker-configuration.d.ts']
      }
    }
  },

  integrations: [preact(), sitemap()],
  adapter: cloudflare()
});