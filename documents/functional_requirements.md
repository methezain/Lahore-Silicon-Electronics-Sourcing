# Functional Requirements Specification (FRS)
**Project:** Lahore Electronics On-Demand Sourcing & Distribution Platform  
**Target Market:** Lahore & Nationwide (Pakistan)  
**Business Model:** Direct Sourcing (Hall Road Hub) with Upfront Payment

---

## 1. Executive Summary & Core Objectives
The platform operates as a high-speed, minimalist online counter for electronic parts and components sourced on-demand from Hall Road, Lahore. The primary objective is to deliver sub-second browsing, instant part search, and zero-friction order placement without the bloat of traditional e-commerce engines.

---

## 2. Product Catalog & Browsing Requirements
* **2.1 High-Density Component Directory:**
  * Catalog layout must resemble a physical counter inventory sheet (tabular / dense grid view) rather than consumer lifestyle cards.
  * Essential fields displayed at a glance: Part Number / SKU, Component Name, Technical Category, Package/Form Factor, Unit Price (PKR), and Sourcing Status.
* **2.2 Stock & Sourcing Transparency:**
  * Every item must clearly indicate sourcing status: `Available via Hall Road Hub (Same-Day / Next-Day Procurement)`.
  * Dynamic lead time indicators based on order cutoff time (e.g., "Orders before 3:00 PM dispatched same day").
* **2.3 Instant Search & Multi-Parametric Filter:**
  * Real-time client-side search indexing exact component numbers (e.g., *NE555*, *LM2596*, *ESP32-WROOM-32*, *0805 10k Resistor*).
  * Fast attribute filtering: Category, Mounting Type (Through-Hole, SMD), Operating Voltage, and Package.
* **2.4 Micro-Specifications Display:**
  * Lean product pages containing high-density specification tables (key electrical ratings, pin count, package type, datasheet download link if available).
  * No generic marketing filler; strictly factual technical specifications.

---

## 3. Order Capture & Checkout Workflow
* **3.1 Single-Screen Direct Checkout:**
  * Zero mandatory account creation / zero multi-step checkout wizard.
  * Direct "Buy Now" or single-cart checkout requiring only essential delivery data:
    * Full Name
    * WhatsApp / Phone Number (mandatory for dispatch verification)
    * Delivery Address & City (Lahore vs. Other Cities)
    * Order Quantity & Delivery Notes
* **3.2 Advance Payment Protocol:**
  * Clear checkout screen providing direct Pakistani banking & wallet instructions:
    * Bank Account (IBAN / Title / Account #)
    * Microfinance Wallets (Raast ID, Nayapay, Sadapay, JazzCash, EasyPaisa)
  * Field for Customer Transaction Proof (Transaction ID / Reference Number and optional image upload of receipt).
* **3.3 Anti-Bot & Abuse Protection:**
  * Integration of Cloudflare Turnstile on checkout submission to prevent automated spam orders from exhausting API quotas.

---

## 4. Notifications & Order Routing Pipeline
* **4.1 Resend API Email Trigger:**
  * Immediate automated dual-dispatch on checkout:
    * **Partner Alert Email:** Dispatched instantly to both business partners containing Buyer Name, Phone/WhatsApp, Complete Address, Items Ordered, Total PKR, and Payment Reference.
    * **Customer Confirmation Email:** Direct transactional confirmation acknowledging receipt and outlining verification steps.
* **4.2 Data Persistence Fallback:**
  * Orders must be committed to the edge database (Cloudflare D1) *before* triggering the Resend API call to guarantee zero data loss if an email rate limit is encountered.
* **4.3 Direct WhatsApp Fallback Link:**
  * Order confirmation screen displays a pre-formatted WhatsApp chat link with the order summary, allowing buyers to verify payments immediately with one tap.

---

## 5. Administration & Order Lifecycle Management
* **5.1 Lightweight Partner Admin Dashboard:**
  * Simple, password/token-protected view displaying recent orders, status, and payment verification info.
* **5.2 Order Lifecycle States:**
  1. `Payment Verification Pending`
  2. `Procuring from Market (Hall Road)`
  3. `Packed & Ready for Dispatch`
  4. `Dispatched (Courier Tracking Assigned)`
  5. `Delivered / Completed`