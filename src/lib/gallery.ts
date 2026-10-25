/**
 * Product gallery behavior. docs/motion.md #12 (zoom) and #13 (viewer).
 * Spring-smooth is visualDuration 0.4, bounce 0. Leave-zoom uses --dur-2
 * because --dur-base is not a token yet.
 */

import { animateEl, prefersReducedMotion, stopMotion } from "./motion";

const mounted = new WeakSet<HTMLElement>();

export function mountGalleries(): void {
  document.querySelectorAll<HTMLElement>("[data-gallery]").forEach((root) => {
    if (mounted.has(root)) return;
    mounted.add(root);
    const galleryTrack = root.querySelector(".gallery-track");
    const well = root.querySelector(".gallery-well");
    const dialog = root.querySelector(".gallery-viewer");
    const viewerTrack = root.querySelector(".viewer-track");
    if (!(galleryTrack instanceof HTMLElement) || !(well instanceof HTMLElement)) return;
    if (!(dialog instanceof HTMLDialogElement) || !(viewerTrack instanceof HTMLElement)) return;
    bindGallery(root, galleryTrack, well, dialog, viewerTrack);
  });
}

function bindGallery(
  root: HTMLElement,
  galleryTrack: HTMLElement,
  well: HTMLElement,
  dialog: HTMLDialogElement,
  viewerTrack: HTMLElement,
): void {

  const noteEl = root.querySelector<HTMLElement>("[data-gallery-note]");
  const statusEl = root.querySelector<HTMLElement>("[data-gallery-status]");
  const compactQuery = window.matchMedia("(max-width: 899px)");
  const zoomQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  let index = 0;
  let flightId = 0;
  let opener: HTMLElement | null = null;
  let galleryLock = 0;
  let viewerLock = 0;
  let zoomFrame = 0;
  let pointer: { x: number; y: number } | null = null;

  const gallerySlides = () => [...galleryTrack.querySelectorAll<HTMLElement>(":scope > .gallery-slide")];
  const viewerSlides = () => [...viewerTrack.querySelectorAll<HTMLElement>(":scope > .viewer-slide")];

  function currentImage(): HTMLImageElement | null {
    const img = gallerySlides()[index]?.querySelector("img");
    return img instanceof HTMLImageElement ? img : null;
  }

  function viewerPhoto(slideIndex: number): HTMLElement | null {
    const photo = viewerSlides()[slideIndex]?.querySelector(".viewer-photo");
    return photo instanceof HTMLElement ? photo : null;
  }

  function sourceRect(): DOMRect {
    const stage = gallerySlides()[index]?.querySelector(".photo-stage");
    if (stage instanceof HTMLElement) return stage.getBoundingClientRect();
    const open = gallerySlides()[index]?.querySelector(".gallery-open");
    return (open instanceof HTMLElement ? open : well).getBoundingClientRect();
  }

  function setIndex(next: number, options: { announce?: boolean; focus?: "thumb" | "open" | "dot" } = {}): void {
    const slides = gallerySlides();
    const count = slides.length;
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    const changed = clamped !== index;
    index = clamped;

    slides.forEach((slide, i) => slide.classList.toggle("is-current", i === index));
    root.querySelectorAll<HTMLElement>(".thumb").forEach((thumb, i) => {
      const on = i === index;
      thumb.classList.toggle("is-current", on);
      if (on) thumb.setAttribute("aria-current", "true");
      else thumb.removeAttribute("aria-current");
    });
    for (const selector of [".gallery-dots .dot", ".viewer-dots .dot"]) {
      root.querySelectorAll<HTMLElement>(selector).forEach((dot, i) => {
        const on = i === index;
        dot.classList.toggle("is-current", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    moveTransitionName();

    const note = slides[index]?.dataset.note ?? "";
    if (noteEl) {
      noteEl.textContent = note;
      noteEl.hidden = note.length === 0;
    }
    if (options.announce && changed && count > 1 && statusEl) {
      const alt = currentImage()?.alt ?? "";
      statusEl.textContent = alt
        ? `Photograph ${index + 1} of ${count}, ${alt}`
        : `Photograph ${index + 1} of ${count}`;
    }
    if (options.focus === "thumb") {
      root.querySelectorAll<HTMLElement>(".thumb")[index]?.focus({ preventScroll: true });
    } else if (options.focus === "open") {
      slides[index]?.querySelector<HTMLElement>(".gallery-open")?.focus({ preventScroll: true });
    } else if (options.focus === "dot") {
      const selector = dialog.open ? ".viewer-dots .dot" : ".gallery-dots .dot";
      root.querySelectorAll<HTMLElement>(selector)[index]?.focus({ preventScroll: true });
    }
  }

  function moveTransitionName(): void {
    const imgs = [...galleryTrack.querySelectorAll<HTMLImageElement>("img")];
    const name = imgs.flatMap((img) => [...img.classList]).find((className) => className.startsWith("vt-"));
    if (!name) return;
    for (const img of imgs) img.classList.remove(name);
    currentImage()?.classList.add(name);
  }

  function scrollPane(
    track: HTMLElement,
    slides: HTMLElement[],
    behavior: ScrollBehavior,
    kind: "gallery" | "viewer",
  ): void {
    const slide = slides[index];
    if (!slide) return;
    if (Math.abs(track.scrollLeft - slide.offsetLeft) < 2) return;
    if (kind === "gallery") galleryLock += 1;
    else viewerLock += 1;
    const lock = kind === "gallery" ? galleryLock : viewerLock;
    track.scrollTo({ left: slide.offsetLeft, behavior });
    let released = false;
    const release = () => {
      if (released) return;
      const current = kind === "gallery" ? galleryLock : viewerLock;
      if (current !== lock) return;
      released = true;
      if (kind === "gallery") galleryLock = 0;
      else viewerLock = 0;
    };
    track.addEventListener("scrollend", release, { once: true });
    window.setTimeout(release, behavior === "smooth" ? 700 : 40);
  }

  function scrollGallery(behavior: ScrollBehavior): void {
    if (!compactQuery.matches) return;
    scrollPane(galleryTrack, gallerySlides(), behavior, "gallery");
  }

  function scrollViewer(behavior: ScrollBehavior): void {
    scrollPane(viewerTrack, viewerSlides(), behavior, "viewer");
  }

  function behaviorFor(): ScrollBehavior {
    return prefersReducedMotion() ? "auto" : "smooth";
  }

  function nextFlight(): number {
    flightId += 1;
    const flyer = dialog.querySelector(".gallery-flyer");
    if (flyer) stopMotion(flyer);
    return flightId;
  }

  function freezeFlyer(flyer: HTMLElement): void {
    const parsed = decompose(getComputedStyle(flyer).transform);
    flyer.style.transition = "none";
    if (!parsed) return;
    flyer.style.transform = `translate(${parsed.tx}px, ${parsed.ty}px) scale(${parsed.sx}, ${parsed.sy})`;
  }

  async function runTo(flyer: HTMLElement, to: string, id: number): Promise<void> {
    flyer.classList.add("is-moving");
    try {
      await animateEl(flyer, { transform: to }, { spring: "smooth", cancelled: () => id !== flightId });
    } finally {
      if (id === flightId) flyer.classList.remove("is-moving");
    }
  }

  function makeFlyer(slideIndex: number): HTMLElement {
    const source = gallerySlides()[slideIndex]?.querySelector(".photo-stage, picture, img");
    const flyer = document.createElement("div");
    flyer.className = "gallery-flyer";
    flyer.setAttribute("aria-hidden", "true");
    if (source) {
      const clone = source.cloneNode(true);
      if (clone instanceof HTMLElement) {
        stripTransitionName(clone);
        flyer.appendChild(clone);
      }
    }
    return flyer;
  }

  function placeFlyer(flyer: HTMLElement, dest: DOMRect): void {
    flyer.style.left = `${dest.left}px`;
    flyer.style.top = `${dest.top}px`;
    flyer.style.width = `${dest.width}px`;
    flyer.style.height = `${dest.height}px`;
    flyer.style.transformOrigin = "0 0";
  }

  function clearZoom(): void {
    well.classList.add("is-instant");
    well.classList.remove("is-zooming");
    const img = currentImage();
    if (img) img.style.willChange = "";
    void well.offsetWidth;
    well.classList.remove("is-instant");
  }

  function focusClose(): void {
    dialog.querySelector<HTMLElement>(".viewer-close")?.focus({ preventScroll: true });
  }

  function restoreFocus(): void {
    const button = gallerySlides()[index]?.querySelector(".gallery-open");
    if (button instanceof HTMLElement) button.focus({ preventScroll: true });
    else opener?.focus({ preventScroll: true });
  }

  function finishClose(): void {
    dialog.querySelectorAll(".gallery-flyer").forEach((node) => node.remove());
    dialog.querySelectorAll(".is-covered").forEach((node) => node.classList.remove("is-covered"));
    dialog.classList.remove("is-open");
    root.classList.remove("is-viewing");
    if (dialog.open) dialog.close();
    restoreFocus();
  }

  async function openViewer(next: number, button: HTMLElement): Promise<void> {
    if (dialog.open) return;
    opener = button;
    clearZoom();
    setIndex(next);
    const id = nextFlight();
    root.classList.add("is-viewing");
    dialog.showModal();
    scrollViewer("auto");
    focusClose();

    const destEl = viewerPhoto(index);
    const dest = destEl?.getBoundingClientRect();
    const source = sourceRect();
    const reduced = prefersReducedMotion();
    if (reduced || !destEl || !dest || dest.width < 2 || source.width < 2) {
      window.requestAnimationFrame(() => {
        if (id !== flightId || !dialog.open) return;
        dialog.classList.add("is-open");
      });
      return;
    }

    const flyer = makeFlyer(index);
    placeFlyer(flyer, dest);
    flyer.style.transform = mapTransform(source, dest);
    destEl.classList.add("is-covered");
    dialog.appendChild(flyer);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (id !== flightId || !dialog.open) return;
        dialog.classList.add("is-open");
        void runTo(flyer, "translate(0px, 0px) scale(1, 1)", id).then(() => {
          if (id !== flightId) return;
          destEl.classList.remove("is-covered");
          flyer.remove();
        });
      });
    });
  }

  async function closeViewer(): Promise<void> {
    if (!dialog.open) return;
    const existing = dialog.querySelector(".gallery-flyer");
    if (existing instanceof HTMLElement) freezeFlyer(existing);
    const id = nextFlight();

    if (prefersReducedMotion()) {
      dialog.classList.remove("is-open");
      window.setTimeout(() => {
        if (id !== flightId) return;
        finishClose();
      }, 160);
      return;
    }

    if (compactQuery.matches) scrollGallery("auto");
    const destEl = viewerPhoto(index);
    let flyer = dialog.querySelector(".gallery-flyer");
    if (!(flyer instanceof HTMLElement) && destEl) {
      const created = makeFlyer(index);
      const dest = destEl.getBoundingClientRect();
      placeFlyer(created, dest);
      created.style.transform = "translate(0px, 0px) scale(1, 1)";
      dialog.appendChild(created);
      destEl.classList.add("is-covered");
      flyer = created;
    }
    if (!(flyer instanceof HTMLElement)) {
      finishClose();
      return;
    }

    const dest = destEl?.getBoundingClientRect();
    const target = mapTransform(sourceRect(), dest && dest.width > 1 ? dest : sourceRect());
    await runTo(flyer, target, id);
    if (id !== flightId) return;
    flyer.remove();
    root.classList.remove("is-viewing");
    dialog.classList.remove("is-open");
    window.setTimeout(() => {
      if (id !== flightId) return;
      finishClose();
    }, 220);
  }

  function dropFlyer(): void {
    nextFlight();
    dialog.querySelectorAll(".gallery-flyer").forEach((node) => node.remove());
    dialog.querySelectorAll(".is-covered").forEach((node) => node.classList.remove("is-covered"));
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const enlarge = target.closest(".gallery-open");
    if (enlarge instanceof HTMLElement && !enlarge.closest(".gallery-viewer")) {
      const slide = enlarge.closest(".gallery-slide");
      const raw = slide instanceof HTMLElement ? slide.dataset.index : "0";
      void openViewer(Number(raw ?? "0"), enlarge);
      return;
    }

    const thumb = target.closest(".thumb");
    if (thumb instanceof HTMLElement) {
      setIndex(Number(thumb.dataset.index ?? "0"), { announce: true });
      scrollGallery(behaviorFor());
      return;
    }

    const dot = target.closest(".dot");
    if (dot instanceof HTMLElement) {
      const next = Number(dot.dataset.index ?? "0");
      const inViewer = Boolean(dot.closest(".gallery-viewer"));
      setIndex(next, { announce: true });
      if (inViewer) scrollViewer(behaviorFor());
      else scrollGallery(behaviorFor());
      return;
    }

    if (!dialog.open) return;
    if (target.closest(".viewer-close")) {
      void closeViewer();
      return;
    }
    if (target.closest(".viewer-photo")) return;
    if (target.closest(".gallery-viewer")) void closeViewer();
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    void closeViewer();
  });

  viewerTrack.addEventListener("pointerdown", () => {
    if (dialog.open && dialog.querySelector(".gallery-flyer")) dropFlyer();
  });

  galleryTrack.addEventListener(
    "scroll",
    () => {
      if (galleryLock !== 0 || !compactQuery.matches) return;
      const next = indexFromScroll(galleryTrack, gallerySlides());
      if (next !== index) setIndex(next, { announce: true });
    },
    { passive: true },
  );

  viewerTrack.addEventListener(
    "scroll",
    () => {
      if (!dialog.open || viewerLock !== 0) return;
      const next = indexFromScroll(viewerTrack, viewerSlides());
      if (next === index) return;
      setIndex(next, { announce: true });
      scrollGallery("auto");
    },
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const viewerOpen = dialog.open;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
    const inGallery = target instanceof Node && root.contains(target);
    if (!viewerOpen && !inGallery) return;
    const count = gallerySlides().length;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = index + delta;
    if (next < 0 || next >= count) {
      if (viewerOpen) event.preventDefault();
      return;
    }
    event.preventDefault();
    const focus = focusTarget(target, viewerOpen);
    setIndex(next, { announce: true, focus });
    scrollGallery(behaviorFor());
    if (viewerOpen) scrollViewer(behaviorFor());
  });

  well.addEventListener("pointerenter", (event) => {
    if (!zoomQuery.matches || prefersReducedMotion() || dialog.open || event.pointerType === "touch") return;
    well.classList.add("is-zooming");
    const img = currentImage();
    if (img) img.style.willChange = "transform";
    pointer = { x: event.clientX, y: event.clientY };
    scheduleZoom();
  });

  well.addEventListener("pointermove", (event) => {
    if (!well.classList.contains("is-zooming")) return;
    pointer = { x: event.clientX, y: event.clientY };
    scheduleZoom();
  });

  well.addEventListener("pointerleave", endZoom);
  well.addEventListener("pointercancel", endZoom);

  function endZoom(): void {
    if (!well.classList.contains("is-zooming")) return;
    well.classList.remove("is-zooming");
    const img = currentImage();
    if (!img) return;
    const clear = () => {
      img.style.willChange = "";
    };
    if (prefersReducedMotion()) clear();
    else img.addEventListener("transitionend", clear, { once: true });
  }

  function scheduleZoom(): void {
    if (zoomFrame) return;
    zoomFrame = window.requestAnimationFrame(() => {
      zoomFrame = 0;
      if (!pointer || !well.classList.contains("is-zooming")) return;
      const img = currentImage();
      const rect = img?.getBoundingClientRect() ?? well.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = clamp(((pointer.x - rect.left) / rect.width) * 100);
      const y = clamp(((pointer.y - rect.top) / rect.height) * 100);
      img?.style.setProperty("--zoom-x", `${x}%`);
      img?.style.setProperty("--zoom-y", `${y}%`);
    });
  }
}

function focusTarget(target: EventTarget | null, viewerOpen: boolean): "thumb" | "open" | "dot" | undefined {
  if (!(target instanceof HTMLElement)) return;
  if (target.closest(".dot")) return "dot";
  if (!viewerOpen && target.closest(".thumb")) return "thumb";
  if (!viewerOpen && target.closest(".gallery-open")) return "open";
  return undefined;
}

function indexFromScroll(track: HTMLElement, slides: HTMLElement[]): number {
  const left = track.scrollLeft;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  slides.forEach((slide, i) => {
    const dist = Math.abs(slide.offsetLeft - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function mapTransform(source: DOMRect, dest: DOMRect): string {
  const sx = source.width / dest.width;
  const sy = source.height / dest.height;
  const tx = source.left - dest.left;
  const ty = source.top - dest.top;
  return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
}

function decompose(transform: string): { tx: number; ty: number; sx: number; sy: number } | null {
  if (!transform || transform === "none") return { tx: 0, ty: 0, sx: 1, sy: 1 };
  const match = /matrix\(([^)]+)\)/.exec(transform);
  if (!match) return null;
  const values = match[1].split(",").map((part) => Number.parseFloat(part));
  if (values.length < 6 || values.some((value) => Number.isNaN(value))) return null;
  const [sx, , , sy, tx, ty] = values;
  return { tx, ty, sx, sy };
}

function stripTransitionName(node: HTMLElement): void {
  const nodes = [node, ...node.querySelectorAll<HTMLElement>("*")];
  for (const element of nodes) {
    for (const className of [...element.classList]) {
      if (className.startsWith("vt-")) element.classList.remove(className);
    }
  }
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
