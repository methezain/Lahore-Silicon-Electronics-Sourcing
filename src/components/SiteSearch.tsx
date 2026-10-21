import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import "./search-dialog.css";
import PackageMark, { PackageFallback } from "./illustrations/PackageMark.tsx";
import PhotoStage from "./PhotoStage.tsx";
import PartsPreview from "./PartsPreview";
import { searchCatalog, sourcingOffer, type SearchPart } from "../lib/catalog-search";
import { counterPlace } from "../lib/desk";
import { formatPkr } from "../lib/money";
import {
  addLabel,
  addableMatches,
  looksLikePartsList,
  resolvePartsList,
} from "../lib/parts-list";
import { highlightMatch } from "../lib/search-highlight";
import { stockLabel, stockLevel } from "../lib/stock";
import { addLinesToCart, isCartDrawerOpen } from "../store/cartStore";

export type SearchRecord = SearchPart & {
  price: number;
  stock_qty: number;
  min_qty: number;
  qty_multiple: number;
  package_type: string;
  image?: string;
  restock_on?: string;
};

export type SearchCategory = {
  name: string;
  count: number;
  href: string;
};

type Props = {
  parts: SearchRecord[];
  categories: SearchCategory[];
  /** `https://wa.me/…` with no message. Omitted when the shop number is unset. */
  whatsappBase?: string;
};

type PageLink = { title: string; href: string; detail: string };

type PaletteRow =
  | { kind: "review" }
  | { kind: "part"; part: SearchRecord }
  | { kind: "category"; category: SearchCategory }
  | { kind: "page"; page: PageLink }
  | { kind: "recent"; query: string };

type Section = { id: string; label: string; rows: PaletteRow[] };

const PLACEHOLDER = 'LM7805, ESP32, "5 V regulator"';
const LIST_PLACEHOLDER = "LM7805 x10\nNE555, 5\nams1117 3.3 - 20";
const RECENT_KEY = "lahore_silicon_recent_searches";
const RECENT_MAX = 6;

/** motion.md #19 spring-snappy. Stepped here because src/lib/motion.ts is not in the tree. */
const SPRING_STIFFNESS = 520;
const SPRING_DAMPING = 42;
const SPRING_MASS = 1;

const PAGES: readonly PageLink[] = [
  { title: "Catalog", href: "/", detail: "All parts" },
  { title: "Quick order", href: "/quick-order", detail: "Paste a parts list" },
  { title: "Home", href: "/home", detail: "Hall Road" },
  { title: "Shipping and payment", href: "/shipping-and-payments", detail: "Delivery and payment" },
  { title: "About", href: "/about", detail: counterPlace },
  { title: "Contact", href: "/contact", detail: "Hours" },
];

function productHref(part: SearchPart): string {
  return `/product/${encodeURIComponent(part.part_number.toLowerCase())}`;
}

function sourcingHref(base: string, query: string): string {
  return `${base}?text=${encodeURIComponent(`Do you stock ${query.trim()}?`)}`;
}

function partNoun(count: number): string {
  return count === 1 ? "part" : "parts";
}

function textHits(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function focusableIn(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])")].filter(
    (element) => element.tabIndex !== -1,
  );
}

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function paletteSections(input: {
  query: string;
  parts: readonly SearchRecord[];
  categories: readonly SearchCategory[];
  recent: readonly string[];
}): { sections: Section[]; hits: SearchRecord[]; listed: boolean; showMiss: boolean } {
  const trimmed = input.query.trim();
  const listed = Boolean(trimmed) && looksLikePartsList(trimmed);
  const hits = trimmed && !listed ? searchCatalog(input.parts, trimmed) : [];
  const showMiss = Boolean(trimmed) && !listed && hits.length === 0;
  const sections: Section[] = [];

  if (listed) {
    sections.push({ id: "list", label: "Parts list", rows: [{ kind: "review" }] });
    return { sections, hits, listed, showMiss: false };
  }

  if (!trimmed && input.recent.length > 0) {
    sections.push({
      id: "recent",
      label: "Recent",
      rows: input.recent.map((query) => ({ kind: "recent", query })),
    });
  }

  const partRows = trimmed ? hits : input.parts;
  if (partRows.length > 0) {
    sections.push({
      id: "parts",
      label: "Parts",
      rows: partRows.map((part) => ({ kind: "part", part })),
    });
  }

  const categories = !trimmed || hits.length === 0
    ? input.categories
    : input.categories.filter((category) => textHits(category.name, trimmed));
  if (categories.length > 0) {
    sections.push({
      id: "categories",
      label: "Categories",
      rows: categories.map((category) => ({ kind: "category", category })),
    });
  }

  const pages = PAGES.filter((page) => {
    if (!trimmed || hits.length === 0) return true;
    return textHits(page.title, trimmed) || textHits(page.detail, trimmed);
  });
  if (pages.length > 0) {
    sections.push({
      id: "pages",
      label: "Pages",
      rows: pages.map((page) => ({ kind: "page", page })),
    });
  }

  return { sections, hits, listed, showMiss };
}

function springStep(value: number, velocity: number, target: number, dt: number) {
  const accel = (-SPRING_STIFFNESS * (value - target) - SPRING_DAMPING * velocity) / SPRING_MASS;
  const nextVelocity = velocity + accel * dt;
  return { value: value + nextVelocity * dt, velocity: nextVelocity };
}

function Marked({ text, query }: { text: string; query: string }) {
  const pieces = highlightMatch(text, query);
  return (
    <>
      {pieces.map((piece, index) =>
        piece.hit ? <mark key={index}>{piece.text}</mark> : <span key={index}>{piece.text}</span>,
      )}
    </>
  );
}

export default function SiteSearch({ parts, categories, whatsappBase }: Props) {
  const [query, setQuery] = useState("");
  const [listText, setListText] = useState("");
  const [mode, setMode] = useState<"search" | "list">("search");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [ready, setReady] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [mod, setMod] = useState("Ctrl");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const slideRef = useRef({ y: 0, vy: 0, x: 0, raf: 0 });
  const openFromRef = useRef<(opener: HTMLElement | null) => void>(() => {});
  const closeRef = useRef<(restore?: boolean) => void>(() => {});

  const trimmed = query.trim();
  const built = paletteSections({ query, parts, categories, recent });
  const rows = built.sections.flatMap((section) => section.rows);
  const selected = active >= 0 && active < rows.length ? active : -1;
  const whatsapp = whatsappBase || undefined;
  const listedResult = mode === "list" ? resolvePartsList(listText, parts) : null;
  const adding = listedResult ? addableMatches(listedResult) : [];
  openRef.current = open;

  const status = !trimmed || built.listed
    ? ""
    : built.hits.length === 0
      ? `We don't stock "${trimmed}".`
      : `${built.hits.length} ${partNoun(built.hits.length)}`;

  function openFrom(opener: HTMLElement | null) {
    openerRef.current = opener ?? openButtonRef.current;
    setMode("search");
    setOpen(true);
  }

  function close(restore = true) {
    setOpen(false);
    setMode("search");
    if (!restore) return;
    const opener = openerRef.current ?? openButtonRef.current;
    opener?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!openRef.current) opener?.focus({ preventScroll: true });
    });
  }

  function showList(seed?: string) {
    setListText((current) => (current.trim() ? current : (seed ?? query)));
    setMode("list");
  }

  function remember(value: string) {
    const next = value.trim();
    if (!next || next.length > 80 || next.includes("\n")) return;
    setRecent((current) => {
      const stored = [next, ...current.filter((item) => item.toLowerCase() !== next.toLowerCase())].slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_KEY, JSON.stringify(stored));
      return stored;
    });
  }

  function activate(row: PaletteRow | undefined) {
    if (!row) return;
    if (row.kind === "review") {
      showList(trimmed);
      return;
    }
    if (row.kind === "recent") {
      setQuery(row.query);
      setActive(0);
      return;
    }
    if (row.kind === "part") {
      if (trimmed) remember(trimmed);
      window.location.assign(productHref(row.part));
      return;
    }
    if (row.kind === "category") {
      window.location.assign(row.category.href);
      return;
    }
    window.location.assign(row.page.href);
  }

  function commitList() {
    if (!listedResult || adding.length === 0) return;
    const lines = adding.map((match) => ({
      part_number: match.part_number,
      name: match.name,
      quantity: match.quantity,
      ...(match.image ? { image: match.image } : {}),
    }));
    close(false);
    addLinesToCart(lines);
  }

  openFromRef.current = openFrom;
  closeRef.current = close;

  useEffect(() => {
    setReady(true);
    setRecent(readRecent());
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setMod("⌘");
  }, []);

  useEffect(() => {
    if (!ready) return;
    openButtonRef.current?.setAttribute("data-ready", "true");

    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        if (event.repeat) return;
        event.preventDefault();
        if (openRef.current) {
          closeRef.current(true);
          return;
        }
        isCartDrawerOpen.set(false);
        openFromRef.current(document.getElementById("search-open"));
        return;
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !openRef.current) {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
        const cart = document.querySelector(".cart-sheet");
        if (cart && !cart.hasAttribute("hidden")) return;
        event.preventDefault();
        const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const opener = current && current !== document.body && current !== document.documentElement ? current : null;
        openFromRef.current(opener);
        return;
      }

      if (!openRef.current) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current(true);
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = focusableIn(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && dialog.contains(current);
      if (event.shiftKey && (current === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const opener = target.closest<HTMLElement>("[data-search-open]");
      if (!opener || opener === openButtonRef.current) return;
      event.preventDefault();
      openFromRef.current(opener);
    }

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onClick);
    };
  }, [ready]);

  useEffect(() => {
    if (!open || !ready) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, ready]);

  useEffect(() => {
    if (!open || !ready) return;
    if (mode === "list") listInputRef.current?.focus();
    else inputRef.current?.focus();
  }, [open, ready, mode]);

  useEffect(() => {
    if (open && mode === "search") setActive(0);
  }, [open, mode, query]);

  useEffect(() => {
    if (!open || selected < 0) return;
    document.getElementById(`search-hit-${selected}`)?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [open, selected]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (bar) delete bar.dataset.jumped;
  }, [query, mode]);

  useLayoutEffect(() => {
    const panel = dialogRef.current;
    if (!panel) return;
    if (!open) {
      panel.removeAttribute("data-placed");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trigger = openerRef.current;
    if (!reduce && trigger) {
      const from = trigger.getBoundingClientRect();
      const to = panel.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      panel.style.setProperty("--search-from-x", `${dx}px`);
      panel.style.setProperty("--search-from-y", `${dy}px`);
    } else {
      panel.style.setProperty("--search-from-x", "0px");
      panel.style.setProperty("--search-from-y", "0px");
    }
    panel.removeAttribute("data-placed");
    void panel.offsetWidth;
    panel.setAttribute("data-placed", "true");
  }, [open]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const slide = slideRef.current;
    cancelAnimationFrame(slide.raf);
    slide.raf = 0;
    if (mode !== "search" || !open || selected < 0) {
      bar.hidden = true;
      return;
    }
    const row = document.getElementById(`search-hit-${selected}`);
    if (!row) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const targetY = row.offsetTop;
    const targetH = row.offsetHeight;
    slide.x = row.offsetLeft;
    bar.style.width = `${row.offsetWidth}px`;
    bar.style.height = `${targetH}px`;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const jump = reduce || bar.dataset.jumped !== "true";
    const paint = (y: number) => {
      bar.style.transform = `translate3d(${slide.x}px, ${y}px, 0)`;
    };
    if (jump) {
      slide.y = targetY;
      slide.vy = 0;
      paint(targetY);
      bar.style.willChange = "";
      bar.dataset.jumped = "true";
      return;
    }
    bar.style.willChange = "transform";
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const next = springStep(slide.y, slide.vy, targetY, dt);
      slide.y = next.value;
      slide.vy = next.velocity;
      paint(slide.y);
      if (Math.abs(slide.y - targetY) < 0.5 && Math.abs(slide.vy) < 0.5) {
        slide.y = targetY;
        slide.vy = 0;
        paint(targetY);
        bar.style.willChange = "";
        slide.raf = 0;
        return;
      }
      slide.raf = requestAnimationFrame(tick);
    };
    slide.raf = requestAnimationFrame(tick);
  }, [selected, mode, open, query, rows.length]);

  useEffect(() => () => cancelAnimationFrame(slideRef.current.raf), []);

  function onDialogKey(event: KeyboardEvent) {
    if (mode === "list") return;
    if (event.target !== inputRef.current) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => {
        if (rows.length === 0) return -1;
        return current < 0 ? 0 : Math.min(rows.length - 1, current + 1);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? -1 : current - 1));
      return;
    }
    if (event.key !== "Enter" || event.isComposing) return;
    const index = active >= 0 && active < rows.length ? active : 0;
    const row = rows[index];
    if (!row) return;
    event.preventDefault();
    activate(row);
  }

  function onScrim(event: MouseEvent) {
    if (event.target === event.currentTarget) close(true);
  }

  function onPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData("text") ?? "";
    if (!looksLikePartsList(text)) return;
    event.preventDefault();
    setListText(text);
    setMode("list");
  }

  let cursor = 0;
  const blocks = built.sections.map((section) => {
    const start = cursor;
    cursor += section.rows.length;
    return (
      <div role="group" aria-label={section.label} key={section.id}>
        <p class="search-section" aria-hidden="true">{section.label}</p>
        {section.rows.map((row, local) => {
          const index = start + local;
          const selectedRow = index === selected;
          const choose = () => setActive((current) => (current === index ? current : index));
          if (row.kind === "part") {
            return (
              <a
                key={row.part.part_number}
                id={`search-hit-${index}`}
                class="search-hit"
                role="option"
                aria-selected={selectedRow}
                href={productHref(row.part)}
                data-astro-prefetch="hover"
                onMouseEnter={choose}
                onFocus={choose}
                onClick={() => {
                  if (trimmed) remember(trimmed);
                }}
              >
                <span class="search-photo">
                  {row.part.image ? (
                    <PhotoStage cutout>
                      <img src={row.part.image} alt="" width="56" height="56" decoding="async" />
                    </PhotoStage>
                  ) : (
                    <PackageFallback
                      packageType={row.part.package_type}
                      partNumber={row.part.part_number}
                      textClass="search-photo-fallback"
                    />
                  )}
                </span>
                <span class="search-part"><Marked text={row.part.part_number} query={trimmed} /></span>
                <span class="search-job"><Marked text={row.part.name} query={trimmed} /></span>
                <span class="search-price">{formatPkr(row.part.price)}</span>
                <span class={`search-stock ${stockLevel(row.part.stock_qty)}`}>{stockLabel(row.part.stock_qty, row.part.restock_on)}</span>
              </a>
            );
          }
          if (row.kind === "category") {
            return (
              <a
                key={row.category.name}
                id={`search-hit-${index}`}
                class="search-row"
                role="option"
                aria-selected={selectedRow}
                href={row.category.href}
                onMouseEnter={choose}
                onFocus={choose}
              >
                <Marked text={row.category.name} query={trimmed} />
                <span class="search-count">{row.category.count}</span>
              </a>
            );
          }
          if (row.kind === "page") {
            return (
              <a
                key={row.page.href}
                id={`search-hit-${index}`}
                class="search-row"
                role="option"
                aria-selected={selectedRow}
                href={row.page.href}
                data-astro-prefetch="hover"
                onMouseEnter={choose}
                onFocus={choose}
              >
                <Marked text={row.page.title} query={trimmed} />
                <span class="search-row-detail">{row.page.detail}</span>
              </a>
            );
          }
          if (row.kind === "recent") {
            return (
              <button
                key={row.query}
                id={`search-hit-${index}`}
                class="search-row"
                type="button"
                role="option"
                aria-selected={selectedRow}
                onMouseEnter={choose}
                onFocus={choose}
                onClick={() => activate(row)}
              >
                {row.query}
              </button>
            );
          }
          return (
            <button
              key="review"
              id={`search-hit-${index}`}
              class="search-row"
              type="button"
              role="option"
              aria-selected={selectedRow}
              onMouseEnter={choose}
              onFocus={choose}
              onClick={() => showList(trimmed)}
            >
              Review this parts list
            </button>
          );
        })}
      </div>
    );
  });

  const showListbox = mode === "search" && rows.length > 0;

  const dialog = (
    <div class="search-dialog" hidden={!open} onClick={onScrim}>
      <div
        ref={dialogRef}
        id="search-dialog"
        class="search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onDialogKey}
      >
        <header class="search-head">
          <h2 id="search-title" class="search-title">
            {mode === "search" ? <label for="catalog-search">Search parts</label> : "Search parts"}
          </h2>
          <div class="search-modes" role="group" aria-label="Search mode">
            <button
              type="button"
              class="search-mode"
              aria-pressed={mode === "search"}
              onClick={() => setMode("search")}
            >
              Search
            </button>
            <button
              type="button"
              class="search-mode"
              aria-pressed={mode === "list"}
              onClick={() => showList()}
            >
              Parts list
            </button>
          </div>
          <button class="search-close" type="button" aria-label="Close search" onClick={() => close(true)}>
            <svg width="20" height="20" aria-hidden="true" focusable="false">
              <use href="#close" />
            </svg>
          </button>
        </header>

        {mode === "list" ? (
          <div class="search-field">
            <label class="search-list-label" for="parts-list-input">Parts list</label>
            <textarea
              ref={listInputRef}
              id="parts-list-input"
              class="search-textarea"
              rows={4}
              placeholder={LIST_PLACEHOLDER}
              value={listText}
              spellcheck={false}
              autocapitalize="off"
              onInput={(event) => setListText(event.currentTarget.value)}
            />
          </div>
        ) : (
          <div class="search-field">
            <div class="search-input">
              <svg width="20" height="20" aria-hidden="true" focusable="false">
                <use href="#search" />
              </svg>
              <input
                ref={inputRef}
                id="catalog-search"
                type="search"
                role="combobox"
                placeholder={PLACEHOLDER}
                aria-autocomplete="list"
                aria-expanded={showListbox}
                aria-controls={showListbox ? "search-results" : undefined}
                aria-activedescendant={selected >= 0 ? `search-hit-${selected}` : undefined}
                aria-keyshortcuts="/ Control+K Meta+K"
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                enterkeyhint="search"
                value={query}
                onPaste={onPaste}
                onInput={(event) => {
                  setQuery(event.currentTarget.value);
                  setActive(0);
                }}
              />
            </div>
          </div>
        )}

        <p class="sr-only" aria-live="polite">{built.hits.length > 0 ? status : ""}</p>

        <div class="search-scroll">
          {mode === "list" && listedResult && (
            <div class="search-field">
              <PartsPreview result={listedResult} idPrefix="palette" />
            </div>
          )}
          {mode === "search" && built.showMiss && (
            <div class="search-miss">
              <PackageMark kind="module" empty />
              <p class="search-miss-copy" role="status">{status}</p>
              {whatsapp && (
                <a class="search-source" href={sourcingHref(whatsapp, trimmed)} target="_blank" rel="noopener noreferrer">
                  {sourcingOffer}
                </a>
              )}
            </div>
          )}
          {showListbox && (
            <div id="search-results" ref={listRef} class="search-results" role="listbox" aria-label="Results">
              <div
                ref={barRef}
                class="search-selection"
                role="presentation"
                hidden={selected < 0}
                aria-hidden="true"
              />
              {blocks}
            </div>
          )}
        </div>

        {mode === "list" && (
          <div class="search-list-actions">
            <button type="button" class="search-add" disabled={adding.length === 0} onClick={commitList}>
              {addLabel(adding.length)}
            </button>
          </div>
        )}

        <footer class="search-hints">
          {mode === "search" && (
            <>
              <span><kbd class="search-kbd">↑</kbd><kbd class="search-kbd">↓</kbd> Select</span>
              <span><kbd class="search-kbd">↵</kbd> Open</span>
            </>
          )}
          <span><kbd class="search-kbd">esc</kbd> Close</span>
          <span><kbd class="search-kbd">{mod}</kbd><kbd class="search-kbd">K</kbd></span>
        </footer>
      </div>
    </div>
  );

  return (
    <div class="site-search">
      <button
        ref={openButtonRef}
        id="search-open"
        class="search-trigger"
        type="button"
        aria-label="Search part number or job"
        aria-keyshortcuts="/ Control+K Meta+K"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="search-dialog"
        onClick={() => openFrom(openButtonRef.current)}
      >
        <svg class="search-icon" width="20" height="20" aria-hidden="true" focusable="false">
          <use href="#search" />
        </svg>
        <span class="search-trigger-label">Search part number or job</span>
        <kbd class="search-kbd" aria-hidden="true">/</kbd>
      </button>
      {ready ? createPortal(dialog, document.body) : null}
    </div>
  );
}
