# UI/UX Design System & Layout Specification
**Project:** Lahore Electronics On-Demand Sourcing & Distribution Platform  
**Design Identity:** Premium B2B Dashboard / Modern Floating Card Aesthetic  
**Core Principles:** Distinct Component Islands, High-Contrast Cards, Smooth Geometry, Ultra-Fast Loading

---

## 1. Global Visual Philosophy & Design Rules

### 1.1 Aesthetic Foundations
* **Modern Floating Cards:** UI is constructed using distinct, overlapping "island" cards rather than rigid, monolithic edge-to-edge tables. 
* **Depth & Layering:** Use subtle drop shadows (`shadow-lg`, `shadow-soft`) to establish hierarchy and elevation. Cards can overlap (e.g., an onboarding or summary card overlapping a darker background panel).
* **Smooth Geometry:** Transition away from sharp utilitarian edges to friendly, modern curves. Use pill shapes for navigation, badges, and primary action buttons.
* **No AI/Cyberpunk Tropes:** Keep the color palette professional and grounded. No glowing neon borders or distracting atmospheric halos.

### 1.2 Typography Hierarchy
* **Primary Body & Headings (Sans-Serif):** Highly legible system stack (`Inter`, `system-ui`, `-apple-system`, `sans-serif`).
  * `Heading 1`: 28px - 32px | Bold (Weight 700) | Tight tracking (`tracking-tight`)
  * `Heading 2`: 20px - 24px | Semi-Bold (Weight 600)
  * `Heading 3`: 16px - 18px | Medium (Weight 500)
  * `Body Regular`: 14px | Regular (Weight 400) | Line-height 1.5
  * `Caption / Micro`: 11px - 12px | Regular / Medium (Weight 400/500)
* **Technical Monospace Stack:** Fixed-width font (`JetBrains Mono`, `ui-monospace`) used exclusively for Part Numbers, SKUs, and Prices to maintain technical readability within the soft UI.

### 1.3 Surface & Color Tokens
* `[BG-Canvas]`: Base page background (often a soft neutral like light grey or deep dark mode slate).
* `[BG-Surface]`: Primary cards and container blocks (White in light mode, dark grey/black in dark mode).
* `[Shadow-Elevated]`: Soft, diffused shadows for floating cards to separate them from the canvas.
* `[Accent-Action]`: Main CTA buttons and pills (using the vibrant colors from your provided pallet).
* `[Status-Verified]`: Pill-shaped badges for in-stock or verified status.

### 1.4 Corner Radii & Elevation (The "Soft UI" Approach)
* **Micro Controls & Inputs:** `rounded-lg` (8px).
* **Standard Cards & Containers:** `rounded-2xl` or `rounded-3xl` (16px - 24px) for a modern dashboard feel.
* **Badges, Navbars & CTAs:** Fully rounded pill shapes (`rounded-full`) for navigation docks, search bars, and status indicators.
* **Elevation:** Rely on generous padding and soft drop shadows to give cards a floating, separated aesthetic.

---

## 2. Global Structural Components

### 2.1 The "Floating" Navbar & Top Utility
* **Layout:** Instead of a full-width sticky bar, use a floating "pill-shaped" navbar docked at the top of the screen.
* **Background:** Solid `[BG-Surface]` with a soft drop shadow.
* **Elements:**
  * Sharp brand text alongside a highly rounded search input.
  * Icon-based pill buttons for Cart and User Profile.

### 2.2 Interactive Chat-Bubble Negotiations (Custom Orders)
* For custom sourcing quotes or B2B bulk offers, utilize interactive chat-bubble UI components.
* Differentiates buyer and seller through distinct bubble alignments and colors, terminating in an "Action Card" to accept the offer.

### 2.3 Layered Footer Design
* Use overlapping panels to transition into the footer (e.g., a floating CTA card resting half on the page content and half on the dark footer background).

---

## 3. Page Layouts & Section Architecture

### 3.1 Homepage / Main Component Catalog (`/`)

#### Section A: Hero Quick-Filter Bar
* Compact, pill-based horizontal scrolling tags (`All`, `Microcontrollers`, `Sensors`) instead of rigid square tabs.

#### Section B: The "Card Grid" Catalog
* Shift away from the dense edge-to-edge spreadsheet look. 
* **Distinct Rows/Cards:** Even in list view, each electronic component should be its own floating row card with rounded edges (`rounded-2xl`), separated by margin (`gap-4`) from the background canvas.
* **Card Grid:** Responsive 4-column layout of highly rounded cards. Component image at the top, cleanly partitioned metadata below.

---

### 3.2 Product Detail Page (`/parts/[sku]`)

#### Main Split Layout (Island Approach)
* **Left Island (Visuals):** A large, highly rounded card containing the component imagery on a clean background.
* **Right Island (Data & Checkout):** A separate floating card containing the Monospace title, specifications, and a pill-shaped `[Add to Order]` button.
* **Separation:** The canvas background peeks through between the left and right islands, reinforcing the dashboard aesthetic.

---

### 3.3 Single-Screen Direct Checkout Page (`/checkout`)

#### Nested Card Layout
* **Left Area (Customer Form):** A large rounded card containing clean, well-spaced input fields.
* **Right Area (Payment & Summary):** A distinct, overlapping or elevated card highlighting the total price and bank details.
* **Action Button:** A massive, pill-shaped primary button spanning the width of the summary card.

---

### 3.4 Empty & 404 Fallback States (Chat/Quote UI)
* When a part is not found, display a conversational chat-bubble interface prompting the user to request a custom Hall Road sourcing quote, rather than a standard rigid web form.