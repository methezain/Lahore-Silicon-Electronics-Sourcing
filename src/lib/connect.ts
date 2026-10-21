/**
 * Signature add-to-cart moment. docs/motion.md#signature-moment-connect.
 * `src/lib/motion.ts` is not in this tree; timings use the tokens already in CSS.
 */

import { atom } from "nanostores";
import { partTransitionClass, partTransitionName } from "./part-image";

/** Bumps on a successful buy-panel add so the header plug can connect. */
export const connectPulse = atom(0);

/** Button label holds on "Added", then returns. */
export const ADDED_HOLD_MS = 1600;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function markConnect(): void {
  connectPulse.set(connectPulse.get() + 1);
}

/** `navigator.vibrate(8)` on Android only, and never under reduced motion. */
export function connectHaptic(): void {
  if (prefersReducedMotion()) return;
  if (!/Android/i.test(navigator.userAgent)) return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(8);
}

export function motionMs(token: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

/** Photo morph is desktop only. Mobile opens the sheet without it. */
export function desktopPhotoMorph(): boolean {
  return window.matchMedia("(min-width: 900px)").matches;
}

type ViewTransitionHandle = {
  finished: Promise<void>;
  ready: Promise<void>;
};

export function beginViewTransition(
  update: () => void | Promise<void>,
): ViewTransitionHandle | null {
  const start = (
    document as Document & {
      startViewTransition?: (callback: () => void | Promise<void>) => ViewTransitionHandle;
    }
  ).startViewTransition;
  if (!start) return null;
  return start.call(document, update);
}

/**
 * Move the gallery photo's view-transition name onto the cart line
 * after that line is on screen, so the new snapshot morphs into it.
 */
export function armPhotoMorph(partNumber: string): () => void {
  const name = partTransitionName(partNumber);
  const gallery = document.querySelector<HTMLElement>(
    `.gallery-well .${partTransitionClass(partNumber)}`,
  );
  const cart = document.querySelector<HTMLElement>(
    `[data-connect-part="${CSS.escape(partNumber)}"]`,
  );
  if (!name || !gallery || !cart) return () => {};
  gallery.style.setProperty("view-transition-name", "none");
  cart.style.setProperty("view-transition-name", name);
  cart.style.setProperty("view-transition-class", "part-morph part-photo");
  return () => {
    gallery.style.removeProperty("view-transition-name");
    cart.style.removeProperty("view-transition-name");
    cart.style.removeProperty("view-transition-class");
  };
}

/** Resolves once the cart line for this part has been drawn, or the wait expires. */
export function waitForCartPhoto(partNumber: string): Promise<void> {
  const deadline = performance.now() + 400;
  return new Promise((resolve) => {
    const look = () => {
      const photo = document.querySelector<HTMLElement>(
        `[data-connect-part="${CSS.escape(partNumber)}"] img, [data-connect-part="${CSS.escape(partNumber)}"]`,
      );
      const open = document.querySelector(".cart-sheet:not([hidden])");
      if (photo && open) {
        const image = photo instanceof HTMLImageElement ? photo : photo.querySelector("img");
        if (!(image instanceof HTMLImageElement) || image.complete) {
          resolve();
          return;
        }
        const stop = window.setTimeout(resolve, 80);
        image.decode().then(
          () => {
            window.clearTimeout(stop);
            resolve();
          },
          () => {
            window.clearTimeout(stop);
            resolve();
          },
        );
        return;
      }
      if (performance.now() > deadline) resolve();
      else window.setTimeout(look, 16);
    };
    window.setTimeout(look, 0);
  });
}
