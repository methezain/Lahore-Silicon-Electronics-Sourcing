# Recommended Production Tech Stack
**Architecture:** Static-First Edge Architecture  
**Target Platform:** Cloudflare Pages + Edge Functions  
**Philosophy:** Zero-Bloat, Ultra-Low Latency, High Reliability, Low Operational Cost

---

## 1. Core Framework & Rendering
* **Framework:** **Astro (v4+ / v5+)**
  * *Why:* Astro builds pure static HTML by default with zero client-side JavaScript overhead for catalog and product pages. Delivers sub-100ms loading speeds on low-bandwidth Pakistani mobile networks.
  * *Rendering Mode:* Hybrid Rendering. Static Site Generation (SSG) for all product listings and categories; Cloudflare Pages Server-Side Functions (SSR) for checkout and API endpoints.

---

## 2. Edge Infrastructure & Hosting
* **Hosting Platform:** **Cloudflare Pages**
  * *Why:* Free tier includes unlimited bandwidth, global CDN edge caching (including South Asian edge PoPs), and instant Git-based continuous deployment.
* **Serverless Edge Compute:** **Cloudflare Pages Functions (V8 Workers runtime)**
  * *Why:* Native serverless handlers executing at the edge to process checkout payloads, validate payments, and invoke downstream APIs without cold starts.
* **Database & Order Storage:** **Cloudflare D1 (Serverless SQLite)**
  * *Why:* Fast serverless relational database situated at the Cloudflare edge. Queryable via standard SQL or Drizzle ORM, perfect for logging orders, inventory metadata, and customer details.
* **Asset Storage:** **Cloudflare R2 (Optional / Phase 2)**
  * *Why:* S3-compatible object storage with zero egress fees for hosting high-resolution part diagrams and payment receipt screenshots.

---

## 3. Styling, Design System & UI
* **CSS Engine:** **Tailwind CSS (v3 / v4)**
  * *Design Style:* Utilitarian Physical Counter Aesthetic.
  * *Color Palette:* Neutral zinc/slate monochrome (`#0f172a`, `#334155`, `#f8fafc`) with subtle functional status indicators (emerald green for verified, amber for sourcing).
  * *Typography:* High-legibility system sans-serif stack (`Inter`, `system-ui`, `-apple-system`) with monospace accents for part codes (`ui-monospace`, `JetBrains Mono`).
  * *Rules:* No heavy glassmorphism, no neon glows, no distracting animations. High information density with crisp borders.

---

## 4. Search & Client Interactivity
* **Search Engine:** **Pagefind** (or **Fuse.js**)
  * *Why:* Pagefind builds a static search index at compile time. It runs entirely in the browser using WebAssembly, searching thousands of electronic components in <15ms with zero backend server cost.
* **Client Islands:** **Preact** or **Vanilla TypeScript**
  * *Usage:* Used strictly where client state is needed (e.g., cart drawer, checkout form validation, Turnstile widget). Keeps bundled JavaScript under 20KB total.

---

## 5. Communications, Security & Verification
* **Transactional Email:** **Resend API**
  * *Integration:* Invoked server-side inside Cloudflare Pages Functions (`POST /api/order`).
  * *Volume:* 100 free emails/day (adequate for early-stage sourcing operations).
* **Bot Prevention:** **Cloudflare Turnstile**
  * *Why:* Invisible, friction-free alternative to reCAPTCHA that protects checkout endpoints from automated bot spam.
* **Code & Schema Validation:** **Zod**
  * *Why:* Strict runtime schema validation for incoming checkout POST requests.