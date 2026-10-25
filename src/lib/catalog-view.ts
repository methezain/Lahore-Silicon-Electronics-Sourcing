/**
 * Catalog List / Grid choice. docs/motion.md interactions 5 and 8.
 * The tilt tracks the pointer on CSS variables. Leaving springs back
 * through `animateEl` (`spring-smooth` in src/lib/motion.ts).
 */

import { animateEl, prefersReducedMotion, stopMotion } from "./motion";

export const CATALOG_VIEW_KEY = "lahore_silicon_catalog_view";

/** Matches the layout switch in the design system. List at and above this width. */
export const WIDE_QUERY = "(min-width: 900px)";

export type CatalogView = "list" | "grid";

export function resolveCatalogView(stored: string | null, wide: boolean): CatalogView {
  if (stored === "list" || stored === "grid") return stored;
  return wide ? "list" : "grid";
}

const FINE_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
const MAX_TILT = 4;

type Tilt = { rx: number; ry: number; x: number; y: number };

function readStored(): string | null {
  try {
    return localStorage.getItem(CATALOG_VIEW_KEY);
  } catch {
    return null;
  }
}

function writeStored(view: CatalogView) {
  try {
    localStorage.setItem(CATALOG_VIEW_KEY, view);
  } catch {
    /* Private mode still keeps the choice for this page view. */
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Toggle, photo morph, and pointer tilt. The blocking script in the toggle
 * has already applied a stored choice before first paint.
 */
export function bindCatalogView(): void {
  const root = document.getElementById("catalog-view");
  if (!root || root.dataset.bound === "true") return;
  root.dataset.bound = "true";

  const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-view]")];
  const wide = window.matchMedia(WIDE_QUERY);
  const fine = window.matchMedia(FINE_QUERY);
  const reduce = window.matchMedia(REDUCE_QUERY);

  function locked(): CatalogView | null {
    const value = document.documentElement.getAttribute("data-catalog-view");
    if (value === "list" || value === "grid") return value;
    return null;
  }

  function active(): CatalogView {
    return locked() ?? resolveCatalogView(null, wide.matches);
  }

  function paintPressed(view: CatalogView) {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", button.dataset.view === view ? "true" : "false");
    }
  }

  function commit(view: CatalogView) {
    document.documentElement.setAttribute("data-catalog-view", view);
    writeStored(view);
    paintPressed(view);
  }

  let running: ViewTransition | null = null;

  async function select(view: CatalogView) {
    const from = active();
    if (view === from) return;
    running?.skipTransition();
    const start = document.startViewTransition?.bind(document);
    if (!start) {
      commit(view);
      return;
    }
    const html = document.documentElement;
    const calm = reduce.matches || prefersReducedMotion();
    const photos = namePhotos(from, view, calm);
    html.classList.add("catalog-morph");
    if (calm) html.classList.add("catalog-morph-reduce");
    let applied = false;
    try {
      running = start(() => {
        applied = true;
        commit(view);
        photos.pairNew();
      });
      await running.finished;
    } catch {
      if (!applied) commit(view);
    } finally {
      running = null;
      photos.clear();
      html.classList.remove("catalog-morph", "catalog-morph-reduce");
    }
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const view = button.dataset.view === "grid" ? "grid" : "list";
      select(view);
    });
  }

  wide.addEventListener("change", () => {
    if (readStored() === "list" || readStored() === "grid") return;
    paintPressed(resolveCatalogView(null, wide.matches));
  });

  paintPressed(active());
  const stored = readStored();
  if ((stored === "list" || stored === "grid") && locked() === null) {
    document.documentElement.setAttribute("data-catalog-view", stored);
    paintPressed(stored);
  }
  root.dataset.ready = "true";
  bindTilt(fine, reduce);
  whenIdle(warmHiddenLayout);
}

function layoutPhotos(view: CatalogView): Map<string, HTMLElement> {
  const selector =
    view === "list"
      ? '[data-layout="list"] tr[data-part]:not([hidden]) .thumb'
      : '[data-layout="grid"] li[data-part]:not([hidden]) .well';
  const photos = new Map<string, HTMLElement>();
  for (const el of document.querySelectorAll<HTMLElement>(`#catalog-results ${selector}`)) {
    const part = el.closest<HTMLElement>("[data-part]")?.dataset.part;
    if (part) photos.set(part, el);
  }
  return photos;
}

function onScreen(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function claim(el: HTMLElement, index: number) {
  el.style.setProperty("view-transition-name", `catalog-photo-${index}`);
  el.style.setProperty("view-transition-class", "catalog-photo");
}

function namePhotos(from: CatalogView, to: CatalogView, calm: boolean) {
  const named = new Set<HTMLElement>();
  const source = calm ? new Map<string, HTMLElement>() : layoutPhotos(from);
  const order = new Map([...source.keys()].map((part, index) => [part, index]));
  const seen = new Set<string>();
  for (const [part, el] of source) {
    if (!onScreen(el)) continue;
    claim(el, order.get(part)!);
    named.add(el);
    seen.add(part);
  }
  return {
    pairNew() {
      if (calm) return;
      for (const [part, el] of layoutPhotos(to)) {
        const index = order.get(part);
        if (index === undefined || !(seen.has(part) || onScreen(el))) continue;
        claim(el, index);
        named.add(el);
      }
    },
    clear() {
      for (const el of named) {
        el.style.removeProperty("view-transition-name");
        el.style.removeProperty("view-transition-class");
      }
      named.clear();
    },
  };
}

function whenIdle(task: () => void) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(task, { timeout: 2000 });
  else setTimeout(task, 300);
}

function warmHiddenLayout() {
  const images = document.querySelectorAll<HTMLImageElement>("#catalog-results img");
  for (const image of images) {
    if (image.loading === "lazy") image.loading = "eager";
    void image.decode().catch(() => {});
  }
}

function bindTilt(fine: MediaQueryList, reduce: MediaQueryList) {
  const stage = document.getElementById("catalog-results");
  if (!stage) return;

  const pending = new Map<HTMLElement, Tilt>();
  let frame = 0;

  function enabled(event?: PointerEvent) {
    if (reduce.matches || prefersReducedMotion() || !fine.matches) return false;
    if (event && event.pointerType === "touch") return false;
    return true;
  }

  function cardFrom(event: Event) {
    if (!(event.target instanceof Element)) return null;
    return event.target.closest<HTMLElement>(".grid-card");
  }

  function settle(card: HTMLElement) {
    const rx = card.style.getPropertyValue("--rx") || "0deg";
    const ry = card.style.getPropertyValue("--ry") || "0deg";
    card.classList.remove("is-hot");
    card.style.removeProperty("will-change");
    pending.delete(card);
    const flat = rx === "0deg" && ry === "0deg";
    if (flat || prefersReducedMotion()) {
      stopMotion(card);
      card.classList.remove("is-settling");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.removeProperty("transform");
      return;
    }
    card.classList.add("is-settling");
    void animateEl(
      card,
      { transform: [`rotateX(${rx}) rotateY(${ry})`, "rotateX(0deg) rotateY(0deg)"] },
      { spring: "smooth" },
    ).finally(() => {
      if (card.classList.contains("is-hot")) {
        card.style.removeProperty("transform");
        return;
      }
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.classList.remove("is-settling");
      card.style.removeProperty("transform");
    });
  }

  function flush() {
    frame = 0;
    for (const [card, tilt] of pending) {
      if (!card.classList.contains("is-hot")) continue;
      card.style.setProperty("--rx", `${tilt.rx.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${tilt.ry.toFixed(2)}deg`);
      card.style.setProperty("--sheen-x", `${tilt.x.toFixed(1)}%`);
      card.style.setProperty("--sheen-y", `${tilt.y.toFixed(1)}%`);
    }
    pending.clear();
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(flush);
  }

  stage.addEventListener("pointerover", (event) => {
    if (!enabled(event)) return;
    const card = cardFrom(event);
    if (!card) return;
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    stopMotion(card);
    card.classList.remove("is-settling");
    card.style.removeProperty("transform");
    card.classList.add("is-hot");
    card.style.setProperty("will-change", "transform");
  });

  stage.addEventListener("pointerout", (event) => {
    const card = cardFrom(event);
    if (!card) return;
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    settle(card);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!enabled(event)) return;
    const card = cardFrom(event);
    if (!card || !card.classList.contains("is-hot")) return;
    const rect = card.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    pending.set(card, {
      rx: clamp(dy * MAX_TILT * 2, -MAX_TILT, MAX_TILT),
      ry: clamp(-dx * MAX_TILT * 2, -MAX_TILT, MAX_TILT),
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1) * 100,
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1) * 100,
    });
    schedule();
  });

  reduce.addEventListener("change", () => {
    if (!reduce.matches) return;
    for (const card of stage.querySelectorAll<HTMLElement>(".grid-card.is-hot")) settle(card);
  });
}
