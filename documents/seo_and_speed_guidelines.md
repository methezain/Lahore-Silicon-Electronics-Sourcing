# Web Development Guidelines: SEO & Performance
**Target Score:** 100/100 Google Lighthouse (Performance, Accessibility, Best Practices, SEO)  
**Strategy:** High-Intent Technical SEO (Zero Blog Bloat) & Sub-Second Edge Delivery

---

## Part 1: High-Intent Technical SEO Architecture

### 1.1 Micro-Description Formula for Electronic Parts
Do not write generic filler. Every product page must follow this structured template:
* `[Part Number] [Generic Name]`: [Operating Voltage/Current] [Package Type] [Primary Function]. Sourced from Hall Road, Lahore with fast nationwide delivery across Pakistan.
* *Example:* "LM2596S DC-DC Step-Down Buck Converter Module (3A, 4V-40V to 1.25V-35V). High-efficiency power supply board. Sourced direct from Hall Road, Lahore for electronic hobbyists, R&D labs, and B2B projects."

### 1.2 Semantic HTML Structure
* Every component listing page must use standard semantic tags:
  * `<main>` for primary content.
  * `<h1>` containing the primary part number and generic name (e.g., `<h1>ESP32-WROOM-32D Wi-Fi & Bluetooth Module</h1>`).
  * `<dl>`, `<dt>`, `<dd>` for key-value electrical specifications (Pin Count, Input Voltage, Mounting Style).
  * `<section>` elements with distinct headings (`<h2>Specifications</h2>`, `<h2>Pricing & Procurement</h2>`).

### 1.3 Rich JSON-LD Structured Data
Embed explicit Schema.org markup in the `<head>` of every product page:
```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "LM2596 DC-DC Buck Converter Module",
  "image": ["https://yourdomain.com/images/lm2596.webp"],
  "description": "LM2596 Step-Down Power Supply Module sourced from Hall Road Lahore.",
  "sku": "MOD-LM2596-3A",
  "mpn": "LM2596",
  "brand": {
    "@type": "Brand",
    "name": "Generic"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://yourdomain.com/products/lm2596-buck-converter",
    "priceCurrency": "PKR",
    "price": "280",
    "priceValidUntil": "2027-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Your Store Name",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Lahore",
        "addressRegion": "Punjab",
        "addressCountry": "PK"
      }
    }
  }
}
```

### 1.4 Title Tags & Meta Descriptions
* **Title Tag Formula:** `{Part Number} {Component Name} - Price in Pakistan | Hall Road Sourcing` (Max 60 chars).
* **Meta Description:** Focus on component availability, technical ratings, and shipping from Lahore (Max 155 chars).
* **Automated XML Sitemap:** Generate `sitemap-index.xml` via `@astrojs/sitemap` automatically on every build.

---

## Part 2: Web Performance & Speed Optimization

### 2.1 Core Web Vitals Benchmarks
* **Largest Contentful Paint (LCP):** < 1.2 seconds.
* **First Input Delay (FID) / Interaction to Next Paint (INP):** < 50ms.
* **Cumulative Layout Shift (CLS):** 0.00.

### 2.2 Asset & Image Handling Rules
* **Format:** Strictly convert all component imagery to `.webp` or `.avif`.
* **Explicit Dimensions:** Always define explicit `width` and `height` attributes on `<img>` tags to eliminate layout shift.
* **Priority Loading:**
  * Add `loading="eager"` and `fetchpriority="high"` strictly to the hero/main product image.
  * Add `loading="lazy"` and `decoding="async"` to all secondary images and catalog grid thumbnails.
* **Max Thumbnail Size:** Keep catalog thumbnail images under 25 KB each.

### 2.3 Edge Caching & HTTP Headers
Configure `_headers` for Cloudflare Pages:
```http
# Cache static assets (CSS, JS, WebP, Fonts) indefinitely
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache prerendered HTML with revalidation
/*.html
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

### 2.4 Code Budget & Hydration Limits
* **JavaScript Footprint:** Total initial page JS payload must not exceed 30 KB gzipped.
* **Zero Hydration for Static Elements:** Use Astro's default server-rendered output for headers, footers, tables, and sidebars. Never hydrate elements that do not require user interaction.
* **CSS Optimization:** Ensure Tailwind CSS purges all unused utility classes during the production build.