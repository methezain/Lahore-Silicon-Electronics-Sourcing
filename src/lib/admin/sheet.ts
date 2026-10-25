import { playSpring, prefersReducedMotion, springFlick, springSmooth } from "../../components/cart-motion";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

function closeHrefOf(root: HTMLElement): string {
  return root.querySelector<HTMLAnchorElement>("a[data-sheet-close]")?.getAttribute("href") ?? "/admin/orders";
}

/** Escape, scrim and close button leave by the same path they came. Drag right to close. */
export function mountOrderSheet(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>(".order-sheet-panel");
  if (!panel) return;

  const href = closeHrefOf(root);
  const reduce = prefersReducedMotion();
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.documentElement.classList.add("has-sheet");

  let leaving = false;
  let stop: (() => void) | null = null;

  const travel = () => panel.offsetWidth + 16;
  const place = (x: number) => {
    panel.style.transform = x === 0 ? "" : `translateX(${x}px)`;
  };

  function leave(velocity = 0): void {
    if (leaving) return;
    leaving = true;
    root.dataset.leaving = "true";
    stop?.();
    const go = () => window.location.assign(href);
    if (reduce) {
      go();
      return;
    }
    const from = currentX();
    stop = playSpring(velocity > 600 ? springFlick : springSmooth, from, travel(), velocity, place, go);
  }

  function currentX(): number {
    const match = /translateX\(([-\d.]+)px\)/.exec(panel!.style.transform);
    return match ? Number(match[1]) : 0;
  }

  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[data-sheet-close]")) {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      leave();
    });
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      leave();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKey);

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastT = 0;
  let speed = 0;
  let tracking = false;
  let dragging = false;

  panel.addEventListener("pointerdown", (event) => {
    if (leaving || event.pointerType === "mouse") return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button, summary, a, label")) return;
    tracking = true;
    dragging = false;
    startX = lastX = event.clientX;
    startY = event.clientY;
    lastT = event.timeStamp;
    speed = 0;
  });

  panel.addEventListener("pointermove", (event) => {
    if (!tracking || leaving) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx) || dx < 0) {
        tracking = false;
        return;
      }
      dragging = true;
      root.dataset.dragging = "true";
      panel.setPointerCapture(event.pointerId);
    }
    const dt = Math.max(1, event.timeStamp - lastT);
    speed = ((event.clientX - lastX) / dt) * 1000;
    lastX = event.clientX;
    lastT = event.timeStamp;
    place(Math.max(0, dx));
  });

  const release = () => {
    if (!tracking) return;
    tracking = false;
    if (!dragging) return;
    dragging = false;
    delete root.dataset.dragging;
    const x = currentX();
    if (x > panel.offsetWidth * 0.35 || speed > 600) {
      leave(speed);
      return;
    }
    stop = playSpring(speed > 600 ? springFlick : springSmooth, x, 0, speed, place, () => place(0));
  };
  panel.addEventListener("pointerup", release);
  panel.addEventListener("pointercancel", release);

  panel.tabIndex = -1;
  panel.focus({ preventScroll: true });

  window.addEventListener("pagehide", () => {
    document.documentElement.classList.remove("has-sheet");
    document.removeEventListener("keydown", onKey);
    opener?.focus?.({ preventScroll: true });
  });
}
