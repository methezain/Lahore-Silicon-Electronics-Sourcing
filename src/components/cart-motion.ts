/**
 * Sheet springs from docs/motion.md (#16). Presets and the reduced-motion
 * check come from `src/lib/motion.ts`. The player stays local so a drag can
 * pass release velocity; `animateEl` does not take a velocity.
 */
import { prefersReducedMotion, springs } from "../lib/motion";

export { prefersReducedMotion };

export type SpringPreset = {
  visualDuration: number;
  bounce: number;
};

/** Sheets and dialogs. No overshoot from rest. */
export const springSmooth: SpringPreset = springs.smooth;

/** A drag released with velocity. A little overshoot, then settle. */
export const springFlick: SpringPreset = springs.flick;

/**
 * ω × visualDuration for a critically damped release that still has about 2% left.
 * (1 + u) · e^(−u) ≈ 0.02 when u = 5.83.
 */
const SETTLE = 5.83;

/** Reads a length token such as `--dur-fast` or `--space-16` from the root. */
export function cssNumber(name: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function springOmega(preset: SpringPreset): { omega: number; zeta: number } {
  const visualDuration = preset.visualDuration > 0 ? preset.visualDuration : springSmooth.visualDuration;
  const zeta = preset.bounce <= 0 ? 1 : Math.max(0.05, 1 - preset.bounce);
  return { omega: SETTLE / visualDuration, zeta };
}

export function readTranslateX(transform: string): number | null {
  const match = /translateX\(([-\d.]+)px\)/.exec(transform);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Displacement from `from` toward `to`. `velocity` is px per second. */
export function springOffset(input: {
  from: number;
  to: number;
  velocity: number;
  omega: number;
  zeta: number;
  time: number;
}): { value: number; velocity: number } {
  const { from, to, velocity, omega, zeta, time } = input;
  if (time <= 0 || omega <= 0) return { value: from, velocity };

  const y0 = from - to;
  if (zeta >= 0.999) {
    const decay = Math.exp(-omega * time);
    const position = y0;
    const slope = velocity + omega * position;
    const offset = (position + slope * time) * decay;
    const speed = (slope - omega * (position + slope * time)) * decay;
    return { value: to + offset, velocity: speed };
  }

  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * time);
  const position = y0;
  const slope = (velocity + zeta * omega * position) / omegaD;
  const cosine = Math.cos(omegaD * time);
  const sine = Math.sin(omegaD * time);
  const offset = decay * (position * cosine + slope * sine);
  const speed = -zeta * omega * offset + decay * omegaD * (-position * sine + slope * cosine);
  return { value: to + offset, velocity: speed };
}

/**
 * Runs a spring on the main thread. Calls `onDone` once, unless stopped.
 * A close that passes its target finishes there so the sheet does not bounce back on screen.
 */
export function playSpring(
  preset: SpringPreset,
  from: number,
  to: number,
  velocity: number,
  onFrame: (value: number, velocity: number) => void,
  onDone: () => void,
): () => void {
  if (Math.abs(to - from) < 0.5 && Math.abs(velocity) < 40) {
    onFrame(to, 0);
    onDone();
    return () => {};
  }

  const { omega, zeta } = springOmega(preset);
  const passedTarget = to > from;
  let frame = 0;
  let stopped = false;
  const started = performance.now();

  const step = (now: number) => {
    if (stopped) return;
    const time = (now - started) / 1000;
    const sample = springOffset({ from, to, velocity, omega, zeta, time });
    const arrived = passedTarget && sample.value >= to;
    const settled = Math.abs(sample.value - to) < 0.5 && Math.abs(sample.velocity) < 40;
    if (arrived || settled || time > preset.visualDuration * 3) {
      onFrame(to, 0);
      onDone();
      return;
    }
    onFrame(sample.value, sample.velocity);
    frame = requestAnimationFrame(step);
  };

  onFrame(from, velocity);
  frame = requestAnimationFrame(step);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
  };
}
