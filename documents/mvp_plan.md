# End-to-End MVP Roadmap: Lahore Electronics On-Demand Sourcing Platform

## Overview
This document outlines the step-by-step roadmap to build the MVP of the Lahore Electronics On-Demand Sourcing Platform. The objective is to build an ultra-fast, zero-bloat, highly optimized technical sourcing web app using the specified Edge/Static-First tech stack (Astro, Cloudflare Pages/Functions, D1 Database, TailwindCSS).

---

## Phase 1: Foundation, Infrastructure, & Design System
**Goal:** Initialize the project, set up edge infrastructure, and define the utilitarian UI design system.

1. **Project Initialization**
   - Initialize the Astro (v4/v5) project with Hybrid Rendering enabled.
   - Install core dependencies: Tailwind CSS, Preact (for client islands), Zod.
   - Configure Cloudflare Pages adapter for Astro to enable edge serverless deployment (`@astrojs/cloudflare`).
2. **Design System & Typography**
   - Configure `tailwind.config.mjs`:
     - Setup sans-serif (`Inter`, `system-ui`) and monospace (`JetBrains Mono`) font stacks.
     - Define monochrome palette (`#0f172a`, `#334155`, `#f8fafc`) with strict accent colors (emerald, amber).
     - Disable drop-shadows and blurs; rely on 1px borders for structure.
3. **Database Setup (Cloudflare D1)**
   - Create local and remote Cloudflare D1 SQLite databases.
   - Define the `Orders` table schema (id, customer_name, phone, address, items_json, total_price, payment_ref, status, created_at).
4. **CI/CD Pipeline**
   - Connect the GitHub repository to Cloudflare Pages for automated deployments.

---

## Phase 2: Core Layout & Catalog Infrastructure
**Goal:** Build the master layout and the high-density catalog display using static site generation (SSG).

1. **Global Layout & Navigation**
   - Implement the Top Utility Banner (sourcing status, cutoff time).
   - Build the Global Navbar with the sharp brand wordmark, expansive search input, and Cart drawer trigger.
   - Build the 4-column utilitarian Footer with operational disclosures and support links.
2. **Product Data Architecture**
   - Set up Astro Content Collections (or JSON data stores) for electronic components to enable SSG.
   - Define strict Markdown/JSON schemas ensuring fields like `part_number`, `voltage`, `package_type`, and `price` are mandatory.
3. **Catalog Views**
   - **Dense Table View:** Build the primary tabular view for engineers (Part No, Specs, Price, Quick Add).
   - **Compact Card Grid:** Build the 1:1 image card grid for visual browsing.
   - Implement the view toggle mechanism (Table vs. Grid).

---

## Phase 3: SEO, Search, & Product Pages
**Goal:** Ensure instantaneous discovery and pristine technical SEO for Google indexing.

1. **Static Search Integration**
   - Integrate `Pagefind` (WASM-based static search) to index all component pages at build time.
   - Hook up the Global Navbar search input to Pagefind for <15ms instant queries.
2. **Product Detail Pages (PDP)**
   - Build the 2-column split layout for individual parts (Image/Datasheet on left, Specs/Order on right).
   - Implement the strict semantic HTML structure (`<dl>`, `<dt>`, `<dd>`) for technical specifications.
   - Auto-inject Schema.org `Product` JSON-LD into the `<head>` of every PDP for rich snippets in Google.
3. **Image Optimization**
   - Enforce WebP/AVIF format for all product images.
   - Apply `loading="eager"` and `fetchpriority="high"` strictly to the hero image on PDPs, and `loading="lazy"` for grid thumbnails.

---

## Phase 4: Cart State & Frictionless Checkout
**Goal:** Build the single-screen edge-driven checkout and order persistence pipeline.

1. **Client-Side Cart (Preact Island)**
   - Implement lightweight cart state management (using Nano Stores or Zustand) to track items and quantities without hydration bloat.
   - Build the Slide-out Cart Drawer to review items before checkout.
2. **Single-Screen Checkout UI**
   - Build the 2-column checkout page (Customer Details vs. Payment Protocol).
   - Include clear visual instructions for Raast, Nayapay, and Bank Transfers.
   - Implement Cloudflare Turnstile for invisible bot protection.
3. **Order Processing Edge API (`/api/order`)**
   - Write the Cloudflare Pages Function (V8 Worker) to handle form POST requests.
   - Validate incoming payloads strictly using `Zod`.
   - **Step 1:** Insert the order into the Cloudflare D1 database (Edge Persistence).
   - **Step 2:** Trigger Resend API to dispatch email alerts to partners and the customer.
4. **Order Confirmation & Handoff**
   - Build the `/order-success/[id]` screen.
   - Generate the dynamic "WhatsApp Verification" link pre-filled with the order summary.

---

## Phase 5: Testing, Auditing, & Launch
**Goal:** Finalize the 100/100 Lighthouse score and release the MVP.

1. **Performance Audit**
   - Run Lighthouse audits to ensure LCP < 1.2s, CLS = 0, and JS payload < 30KB.
   - Verify zero hydration on static elements.
2. **SEO Finalization**
   - Generate `sitemap-index.xml` and `robots.txt`.
   - Verify Meta Title lengths and Micro-Description formulas.
3. **End-to-End Testing**
   - Perform a dummy checkout to verify D1 insertion, Resend email delivery, and Turnstile token validation.
4. **Production Go-Live**
   - Map custom domain to Cloudflare Pages.

---

## Phase 6: Future Work (Post-MVP)
**Brief Outlook beyond the MVP:**

1. **Cloudflare R2 Object Storage:** Migrate from bundled repository images to Cloudflare R2 bucket for scalable, zero-egress hosting of high-res component diagrams and payment screenshots.
2. **Lightweight Admin Dashboard:** Build a secure, token-protected route (e.g., `/admin`) that reads directly from D1 to update order statuses (`Pending` -> `Procuring` -> `Dispatched`).
3. **Automated WhatsApp Business API:** Replace manual WhatsApp handoffs with automated order status updates sent directly to customers via Twilio or Meta Graph API.
4. **Dynamic Market Pricing Sync:** Build an integration to fetch real-time USD/PKR exchange rates to adjust component prices globally based on Hall Road import fluctuations.
5. **"Part Not Listed" Sourcing Queue:** Convert the simple sourcing request form into a structured ticketing system inside the DB to track custom procurement requests.
