/**
 * Catalog list behavior. docs/motion.md interaction catalog #2, #6, and #7.
 * Positioning math is pure so it can be tested without a browser.
 * The boot script runs before the table is parsed so the first-visit
 * entrance starts on the first paint and does not replay after a filter load.
 */

export const LIST_ENTERED_KEY = "ls-catalog-list-entered";

/** Hover a row at least this long before the preview appears. motion.md #7. */
export const PREVIEW_DELAY_MS = 150;

/** Fraction of the remaining distance closed each frame. motion.md #7. */
export const PREVIEW_LERP = 0.18;

/** Entrance stagger. motion.md tokens: 30ms, max 8 items. */
export const ENTRANCE_STAGGER_MS = 30;
export const ENTRANCE_LIMIT = 8;

export const PREVIEW_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 1200px)";
export const LIST_QUERY = "(min-width: 900px)";
export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

export const entranceBootScript =
  `(function(){try{var k=${JSON.stringify(LIST_ENTERED_KEY)};` +
  `if(sessionStorage.getItem(k)==="1")return;` +
  `if(!matchMedia(${JSON.stringify(LIST_QUERY)}).matches)return;` +
  `var reduce=matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches;` +
  `document.documentElement.dataset.listEnter=reduce?"fade":"rise";` +
  `sessionStorage.setItem(k,"1");` +
  `}catch(e){}})();`;

/** Items after the 8th share the 8th item's delay. Index is zero-based. */
export function entranceDelay(index: number): number {
  if (index < 0) return 0;
  const capped = Math.min(index, ENTRANCE_LIMIT - 1);
  return capped * ENTRANCE_STAGGER_MS;
}

export function shouldPlayEntrance(alreadyPlayed: boolean, listVisible: boolean): boolean {
  return listVisible && !alreadyPlayed;
}

export function rowStep(index: number, key: string, count: number): number | null {
  if (index < 0 || count <= 0) return null;
  const direction = key === "ArrowDown" || key === "ArrowRight" ? 1 : key === "ArrowUp" || key === "ArrowLeft" ? -1 : 0;
  if (direction === 0) return null;
  const next = index + direction;
  if (next < 0 || next >= count) return null;
  return next;
}

export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function placePreview(
  pointerX: number,
  pointerY: number,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  gap: number,
): { x: number; y: number } {
  let x = pointerX + gap;
  let y = pointerY + gap;
  if (x + card.width > viewport.width - gap) x = pointerX - gap - card.width;
  if (y + card.height > viewport.height - gap) y = pointerY - gap - card.height;
  const maxX = viewport.width - card.width - gap;
  const maxY = viewport.height - card.height - gap;
  return {
    x: Math.min(Math.max(gap, x), Math.max(gap, maxX)),
    y: Math.min(Math.max(gap, y), Math.max(gap, maxY)),
  };
}

const ROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select") !== null;
}

function previewAllowed(): boolean {
  return window.matchMedia(PREVIEW_QUERY).matches && !window.matchMedia(REDUCE_QUERY).matches;
}

/** Drop the entrance flag after the sequence so a later filter render does not replay it. */
export function settleListEntrance(panel: Element): void {
  const root = document.documentElement;
  const mode = root.dataset.listEnter;
  if (mode !== "rise" && mode !== "fade") return;

  const clear = () => {
    delete root.dataset.listEnter;
  };

  if (mode === "fade") {
    const scroll = panel.querySelector(".cat-scroll");
    scroll?.addEventListener("animationend", (event) => {
      if (event.target === scroll) clear();
    });
    window.setTimeout(clear, 400);
    return;
  }

  const tbody = panel.querySelector("tbody");
  tbody?.addEventListener("animationend", (event) => {
    if (event.target instanceof HTMLTableRowElement) event.target.classList.add("is-settled");
  });
  const last = tbody?.querySelector("tr:last-child");
  last?.addEventListener("animationend", (event) => {
    if (event.target === last) clear();
  });
  window.setTimeout(clear, 900);
}

function bindKeyboard(panel: HTMLElement): void {
  panel.addEventListener("keydown", (event) => {
    if (!ROW_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isTypingTarget(event.target)) return;
    if (!window.matchMedia(LIST_QUERY).matches) return;
    const tbody = panel.querySelector("tbody");
    if (!tbody || !(event.target instanceof Node) || !tbody.contains(event.target)) return;
    const rows = [...tbody.querySelectorAll<HTMLTableRowElement>("tr.is-linked")].filter((row) => !row.hidden);
    const current = event.target instanceof Element ? event.target.closest("tr") : null;
    const index = current instanceof HTMLTableRowElement ? rows.indexOf(current) : -1;
    if (index < 0) return;
    event.preventDefault();
    const nextIndex = rowStep(index, event.key, rows.length);
    if (nextIndex === null) return;
    // Enter stays on the part link. It is an anchor, so Enter opens the product.
    rows[nextIndex]?.querySelector<HTMLAnchorElement>("a.part-link")?.focus({ focusVisible: true });
  });
}

function bindPreview(panel: HTMLElement): void {
  const preview = panel.querySelector<HTMLElement>("[data-row-preview]");
  const card = preview?.querySelector<HTMLElement>("[data-preview-card]");
  if (!preview || !card) return;
  document.body.appendChild(preview);

  const gap = Number.parseFloat(getComputedStyle(preview).getPropertyValue("--preview-gap")) || 16;
  let measured = { width: 0, height: 0 };
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let frame = 0;
  let token = 0;
  let showTimer = 0;
  let hovered: HTMLTableRowElement | null = null;
  let openRow: HTMLTableRowElement | null = null;

  const writePosition = () => {
    preview.style.setProperty("--preview-x", `${currentX}px`);
    preview.style.setProperty("--preview-y", `${currentY}px`);
  };

  const step = () => {
    currentX = lerp(currentX, targetX, PREVIEW_LERP);
    currentY = lerp(currentY, targetY, PREVIEW_LERP);
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    if (dx * dx + dy * dy < 0.16) {
      currentX = targetX;
      currentY = targetY;
      writePosition();
      frame = 0;
      return;
    }
    writePosition();
    frame = requestAnimationFrame(step);
  };

  const follow = () => {
    if (frame) return;
    frame = requestAnimationFrame(step);
  };

  const aim = (x: number, y: number, snap: boolean) => {
    const pos = placePreview(x, y, measured, { width: window.innerWidth, height: window.innerHeight }, gap);
    targetX = pos.x;
    targetY = pos.y;
    preview.dataset.sideX = pos.x < x ? "left" : "right";
    preview.dataset.sideY = pos.y < y ? "above" : "below";
    if (snap) {
      currentX = targetX;
      currentY = targetY;
      writePosition();
      return;
    }
    follow();
  };

  const conceal = () => {
    token += 1;
    window.clearTimeout(showTimer);
    hovered = null;
    openRow = null;
    preview.classList.remove("is-on");
    const mine = token;
    window.setTimeout(() => {
      if (mine !== token) return;
      preview.classList.remove("is-placed");
    }, 180);
  };

  const reveal = (row: HTMLTableRowElement, x: number, y: number) => {
    const template = row.querySelector<HTMLTemplateElement>("template.row-preview-src");
    if (!template) return;
    const mine = ++token;
    pointerX = x;
    pointerY = y;
    const switching = preview.classList.contains("is-on");
    if (openRow !== row) {
      card.replaceChildren(template.content.cloneNode(true));
      openRow = row;
    }
    // Read size on the next frame, write position on the frame after that.
    requestAnimationFrame(() => {
      if (mine !== token) return;
      measured = { width: preview.offsetWidth, height: preview.offsetHeight };
      requestAnimationFrame(() => {
        if (mine !== token) return;
        aim(pointerX, pointerY, !switching);
        preview.classList.add("is-placed");
        if (switching) {
          preview.classList.add("is-on");
          return;
        }
        requestAnimationFrame(() => {
          if (mine !== token) return;
          preview.classList.add("is-on");
        });
      });
    });
  };

  preview.addEventListener(
    "load",
    (event) => {
      if (!(event.target instanceof HTMLImageElement) || !preview.classList.contains("is-placed")) return;
      const mine = token;
      requestAnimationFrame(() => {
        if (mine !== token) return;
        measured = { width: preview.offsetWidth, height: preview.offsetHeight };
        requestAnimationFrame(() => {
          if (mine !== token) return;
          aim(pointerX, pointerY, false);
        });
      });
    },
    true,
  );

  panel.addEventListener("pointerover", (event) => {
    if (!previewAllowed() || event.pointerType === "touch") return;
    if (!(event.target instanceof Element)) return;
    const row = event.target.closest("tr.is-linked");
    if (!(row instanceof HTMLTableRowElement)) return;
    if (row === hovered) return;
    hovered = row;
    pointerX = event.clientX;
    pointerY = event.clientY;
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => {
      if (hovered !== row) return;
      reveal(row, pointerX, pointerY);
    }, PREVIEW_DELAY_MS);
  });

  panel.addEventListener("pointerout", (event) => {
    const nextNode = event.relatedTarget;
    const next = nextNode instanceof Element ? nextNode : nextNode instanceof Node ? nextNode.parentElement : null;
    if (next && panel.contains(next) && next.closest("tr.is-linked") === hovered && hovered) return;
    if (!hovered && !preview.classList.contains("is-placed")) return;
    conceal();
  });

  panel.addEventListener("pointermove", (event) => {
    if (!previewAllowed() || event.pointerType === "touch") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!preview.classList.contains("is-placed") || measured.width === 0) return;
    aim(pointerX, pointerY, false);
  });
}

export function bindCatalogList(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-catalog-list]").forEach((panel) => {
    if (panel.dataset.listBound === "true") return;
    panel.dataset.listBound = "true";
    settleListEntrance(panel);
    bindKeyboard(panel);
    bindPreview(panel);
  });
}
