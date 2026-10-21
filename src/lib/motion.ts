/**
 * Motion presets from docs/motion.md.
 * CSS mirrors live in src/styles/tokens.css.
 * The `motion` package is imported on the first call so product pages
 * keep it off the initial script graph (engineering.md, 45 KB).
 */

export const durationMs = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 360,
  page: 420,
} as const;

/** Seconds, which is what `motion` expects. */
export const durationSec = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
  page: 0.42,
} as const;

export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const springs = {
  snappy: { stiffness: 520, damping: 42, mass: 1 },
  smooth: { visualDuration: 0.4, bounce: 0 },
  flick: { visualDuration: 0.45, bounce: 0.18 },
} as const;

export const staggerMs = 30;
export const staggerMax = 8;
export const distanceRise = 12;

export type SpringName = keyof typeof springs;
export type EasingName = keyof typeof easings;

export type MotionKeyframes = {
  transform?: string | string[];
  opacity?: number | string | Array<number | string>;
  clipPath?: string | string[];
  filter?: string | string[];
};

export type AnimateElOptions = {
  spring?: SpringName;
  duration?: number;
  ease?: readonly [number, number, number, number];
  delay?: number;
  /** Return true to drop the animation after the library loads. */
  cancelled?: () => boolean;
};

const MOTION_EVENT = "lahore-motion";

type MotionApi = {
  animate: typeof import("motion/mini").animate;
  spring: typeof import("motion").spring;
};

let loading: Promise<MotionApi> | null = null;
const running = new WeakMap<Element, { stop: () => void }>();

export function easingCss(curve: readonly [number, number, number, number]): string {
  return `cubic-bezier(${curve.join(", ")})`;
}

/** Delay in seconds. Items after the eighth share the eighth delay. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), staggerMax - 1) * (staggerMs / 1000);
}

export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined") {
    const mode = document.documentElement.dataset.motion;
    if (mode === "reduce") return true;
    if (mode === "full") return false;
  }
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setMotionOverride(mode: "reduce" | "system"): void {
  const root = document.documentElement;
  if (mode === "reduce") root.dataset.motion = "reduce";
  else delete root.dataset.motion;
  root.dispatchEvent(new Event(MOTION_EVENT));
}

export function watchReducedMotion(onChange: () => void): () => void {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const onMedia = () => onChange();
  media.addEventListener("change", onMedia);
  document.documentElement.addEventListener(MOTION_EVENT, onMedia);
  return () => {
    media.removeEventListener("change", onMedia);
    document.documentElement.removeEventListener(MOTION_EVENT, onMedia);
  };
}

export async function preloadMotion(): Promise<void> {
  await loadMotion();
}

export function stopMotion(element: Element): void {
  running.get(element)?.stop();
  running.delete(element);
}

function loadMotion(): Promise<MotionApi> {
  if (!loading) {
    loading = Promise.all([import("motion/mini"), import("motion")]).then(([mini, full]) => ({
      animate: mini.animate,
      spring: full.spring,
    }));
  }
  return loading;
}

function cssProperty(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function applyFinal(element: HTMLElement, keyframes: MotionKeyframes): void {
  for (const [name, value] of Object.entries(keyframes)) {
    if (value === undefined) continue;
    const final = Array.isArray(value) ? value[value.length - 1] : value;
    if (final === undefined) continue;
    element.style.setProperty(cssProperty(name), String(final));
  }
}

/**
 * Animate one element. Springs use `spring` from `motion` with `animate`
 * from `motion/mini`. Reduced motion jumps to the last keyframe.
 */
export async function animateEl(
  element: Element,
  keyframes: MotionKeyframes,
  options: AnimateElOptions = {},
): Promise<void> {
  if (!(element instanceof HTMLElement)) return;
  stopMotion(element);
  if (options.cancelled?.()) return;
  if (prefersReducedMotion()) {
    applyFinal(element, keyframes);
    return;
  }

  const api = await loadMotion();
  if (options.cancelled?.()) return;
  if (prefersReducedMotion()) {
    applyFinal(element, keyframes);
    return;
  }

  const ease = options.ease ?? easings.out;
  const transition = options.spring
    ? { type: api.spring, ...springs[options.spring], delay: options.delay }
    : {
        duration: options.duration ?? durationSec.base,
        ease: [ease[0], ease[1], ease[2], ease[3]] as [number, number, number, number],
        delay: options.delay,
      };

  try {
    const controls = api.animate(
      element,
      keyframes as Parameters<MotionApi["animate"]>[1],
      transition as Parameters<MotionApi["animate"]>[2],
    );
    running.set(element, controls);
    try {
      await controls.finished;
    } catch {
      /* Stopped by the next gesture. */
    } finally {
      if (running.get(element) === controls) running.delete(element);
    }
  } catch {
    applyFinal(element, keyframes);
  }
}
