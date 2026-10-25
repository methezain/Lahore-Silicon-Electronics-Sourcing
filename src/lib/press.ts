/**
 * Press feedback for buttons, pills, cards and rows.
 * docs/motion.md interaction 1: scale to 0.97 in dur-instant,
 * release with spring-snappy. Reduced motion keeps the color change.
 */

import {
  animateEl,
  durationMs,
  easingCss,
  easings,
  prefersReducedMotion,
  preloadMotion,
  stopMotion,
  watchReducedMotion,
} from "./motion";

export const pressSelector = [
  "button:not(:disabled):not([aria-disabled='true'])",
  "[role='button']:not([aria-disabled='true'])",
  "a.btn",
  "a.cart-checkout",
  ".pills a",
  ".site-seg a",
  ".search-cats a",
  "article.card",
  "a.tile",
  "a.companion",
  "tr.is-linked",
  "article.cart-line",
  "a.search-hit",
  ".cats a",
  "[data-press]:not(:disabled):not([aria-disabled='true'])",
].join(", ");

const PRESS_ANIM = "lahore-press";

const tokens = new WeakMap<HTMLElement, number>();
const downs = new WeakMap<HTMLElement, Animation>();

let held: { el: HTMLElement; pointerId: number } | null = null;
let armed = false;

function visualTarget(el: HTMLElement): HTMLElement {
  if (!el.classList.contains("dock")) return el;
  if (!window.matchMedia("(min-width: 900px)").matches) return el;
  const face = el.querySelector(".face");
  return face instanceof HTMLElement ? face : el;
}

function targetFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest("input, textarea, select, option")) return null;
  const match = target.closest(pressSelector);
  if (!(match instanceof HTMLElement)) return null;
  if (match.matches(":disabled") || match.getAttribute("aria-disabled") === "true") return null;
  const blocked = target.closest(":disabled, [aria-disabled='true']");
  if (blocked && match.contains(blocked)) return null;
  return visualTarget(match);
}

function cancelDown(el: HTMLElement): void {
  const current = downs.get(el);
  if (current) {
    current.cancel();
    downs.delete(el);
  }
  for (const anim of el.getAnimations()) {
    if (anim.id === PRESS_ANIM) anim.cancel();
  }
}

function remember(el: HTMLElement): void {
  if (el.dataset.pressing === "true") return;
  el.dataset.pressRestore = el.style.transform;
  el.dataset.pressing = "true";
}

function restore(el: HTMLElement): void {
  if (el.dataset.pressRestore === undefined) {
    delete el.dataset.pressing;
    return;
  }
  el.style.transform = el.dataset.pressRestore;
  delete el.dataset.pressRestore;
  delete el.dataset.pressing;
}

function pressDown(el: HTMLElement): void {
  const next = (tokens.get(el) ?? 0) + 1;
  tokens.set(el, next);
  const interrupting = el.dataset.pressing === "true";
  const from = interrupting ? getComputedStyle(el).transform : "scale(1)";
  remember(el);
  stopMotion(el);
  cancelDown(el);
  if (prefersReducedMotion()) {
    restore(el);
    el.dataset.pressed = "";
    return;
  }
  el.dataset.pressed = "";

  const anim = el.animate(
    [{ transform: from === "none" ? "scale(1)" : from }, { transform: "scale(0.97)" }],
    {
      duration: durationMs.instant,
      easing: easingCss(easings.out),
      fill: "forwards",
      id: PRESS_ANIM,
    },
  );
  downs.set(el, anim);
  void preloadMotion();
}

async function pressUp(el: HTMLElement): Promise<void> {
  const token = tokens.get(el);
  delete el.dataset.pressed;
  if (prefersReducedMotion()) {
    stopMotion(el);
    cancelDown(el);
    restore(el);
    return;
  }

  const from = getComputedStyle(el).transform;
  el.style.transform = from === "none" ? "scale(0.97)" : from;
  cancelDown(el);
  await animateEl(el, { transform: "scale(1)" }, {
    spring: "snappy",
    cancelled: () => tokens.get(el) !== token,
  });
  if (tokens.get(el) !== token) return;
  restore(el);
}

function endHold(event: PointerEvent): void {
  if (!held || event.pointerId !== held.pointerId) return;
  const el = held.el;
  held = null;
  void pressUp(el);
}

export function bindPress(): void {
  if (armed || typeof document === "undefined") return;
  armed = true;

  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = targetFrom(event.target);
    if (!el) return;
    if (held && held.el !== el) void pressUp(held.el);
    held = { el, pointerId: event.pointerId };
    pressDown(el);
  }, true);

  window.addEventListener("pointerup", endHold, true);
  window.addEventListener("pointercancel", endHold, true);

  watchReducedMotion(() => {
    if (!prefersReducedMotion() || !held) return;
    const el = held.el;
    held = null;
    delete el.dataset.pressed;
    stopMotion(el);
    cancelDown(el);
    restore(el);
  });
}
