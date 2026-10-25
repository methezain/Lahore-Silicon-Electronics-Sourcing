/**
 * Demos on /dev/motion. Each play is caused by a button.
 * docs/motion.md tokens, springs, stagger and press.
 */

import {
  animateEl,
  distanceRise,
  durationSec,
  easings,
  prefersReducedMotion,
  setMotionOverride,
  staggerDelay,
  stopMotion,
  watchReducedMotion,
} from "./motion";

function tracks(root: ParentNode, group: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(`[data-lab="${group}"] .lab-track`)];
}

function playTracks(list: HTMLElement[]): void {
  const reduced = prefersReducedMotion();
  for (const track of list) {
    track.classList.remove("is-run");
    if (reduced) track.classList.add("is-settled");
    else track.classList.remove("is-settled");
  }
  for (const track of list) void track.offsetWidth;
  for (const track of list) track.classList.add("is-run");
}

async function playSprings(root: ParentNode): Promise<void> {
  const rows = [...root.querySelectorAll<HTMLElement>("[data-spring]")];
  await Promise.all(rows.map(async (row) => {
    const name = row.dataset.spring;
    if (name !== "snappy" && name !== "smooth" && name !== "flick") return;
    const marker = row.querySelector<HTMLElement>(".lab-marker");
    const track = row.querySelector<HTMLElement>(".lab-track");
    if (!marker || !track) return;
    const travel = Math.max(0, track.clientWidth - marker.offsetWidth - 8);
    const next = marker.dataset.at === "end" ? 0 : travel;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await animateEl(marker, { transform: `translateX(${next}px)` }, { spring: name });
    marker.dataset.at = next === 0 ? "start" : "end";
  }));
}

async function playEntrance(root: ParentNode): Promise<void> {
  const chips = [...root.querySelectorAll<HTMLElement>(".lab-chip")];
  const reduced = prefersReducedMotion();
  for (const chip of chips) stopMotion(chip);
  for (const chip of chips) {
    chip.style.opacity = reduced ? "1" : "0";
    chip.style.transform = reduced ? "none" : `translateY(${distanceRise}px)`;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await Promise.all(chips.map((chip, index) => animateEl(
    chip,
    {
      opacity: [reduced ? 1 : 0, 1],
      transform: [reduced ? "none" : `translateY(${distanceRise}px)`, "translateY(0px)"],
    },
    {
      duration: durationSec.page,
      ease: easings.out,
      delay: staggerDelay(index),
    },
  )));
}

function statusText(): string {
  const override = document.documentElement.dataset.motion === "reduce";
  const system = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (override) return "Reduced motion is on. Color changes stay. Scale and springs are off.";
  if (system) return "This browser asked for reduced motion. Color changes stay. Scale and springs are off.";
  return "Motion is on. A press scales to 0.97 and releases on a spring.";
}

export function bindMotionLab(root: ParentNode = document): void {
  const toggle = root.querySelector<HTMLButtonElement>("#motion-reduce");
  const status = root.querySelector<HTMLElement>("#motion-status");
  if (!toggle || toggle.dataset.labBound === "true") return;
  toggle.dataset.labBound = "true";

  const paint = () => {
    if (status) status.textContent = statusText();
  };
  paint();
  watchReducedMotion(paint);

  toggle.addEventListener("click", () => {
    const pressed = toggle.getAttribute("aria-pressed") === "true";
    const next = !pressed;
    toggle.setAttribute("aria-pressed", next ? "true" : "false");
    setMotionOverride(next ? "reduce" : "system");
    paint();
  });

  root.querySelectorAll<HTMLElement>("[data-lab-play]").forEach((wrap) => {
    wrap.addEventListener("click", () => {
      const which = wrap.dataset.labPlay;
      if (which === "durations") playTracks(tracks(root, "durations"));
      if (which === "easings") playTracks(tracks(root, "easings"));
      if (which === "springs") void playSprings(root);
      if (which === "entrance") void playEntrance(root);
    });
  });
}
