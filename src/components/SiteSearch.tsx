import { useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import "./search-dialog.css";
import { searchCatalog, sourcingOffer, type SearchPart } from "../lib/catalog-search";
import { formatPkr } from "../lib/money";
import { stockLabel, stockLevel } from "../lib/stock";

export type SearchRecord = SearchPart & {
  price: number;
  stock_qty: number;
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

const PLACEHOLDER = 'LM7805, ESP32, "5 V regulator"';

function productHref(part: SearchPart): string {
  return `/product/${encodeURIComponent(part.part_number.toLowerCase())}`;
}

function sourcingHref(base: string, query: string): string {
  return `${base}?text=${encodeURIComponent(`Do you stock ${query.trim()}?`)}`;
}

function partNoun(count: number): string {
  return count === 1 ? "part" : "parts";
}

function focusableIn(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")].filter(
    (element) => element.tabIndex !== -1,
  );
}

export default function SiteSearch({ parts, categories, whatsappBase }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const openFromRef = useRef<(opener: HTMLElement | null) => void>(() => {});
  const closeRef = useRef<() => void>(() => {});

  const trimmed = query.trim();
  const hits = trimmed ? searchCatalog(parts, trimmed) : [];
  const selected = active >= 0 && active < hits.length ? active : -1;
  const whatsapp = whatsappBase || undefined;
  openRef.current = open;

  function openFrom(opener: HTMLElement | null) {
    openerRef.current = opener ?? openButtonRef.current;
    setOpen(true);
  }

  function close() {
    setOpen(false);
    const opener = openerRef.current ?? openButtonRef.current;
    opener?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!openRef.current) opener?.focus({ preventScroll: true });
    });
  }

  openFromRef.current = openFrom;
  closeRef.current = close;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    openButtonRef.current?.setAttribute("data-ready", "true");

    function onKey(event: KeyboardEvent) {
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
        closeRef.current();
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
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, ready]);

  useEffect(() => {
    if (!open || selected < 0) return;
    document.getElementById(`search-hit-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [open, selected]);

  function onDialogKey(event: KeyboardEvent) {
    if (event.target !== inputRef.current) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => {
        if (hits.length === 0) return -1;
        return current < 0 ? 0 : Math.min(hits.length - 1, current + 1);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? -1 : current - 1));
      return;
    }
    if (event.key !== "Enter" || event.isComposing) return;
    const index = active >= 0 && active < hits.length ? active : 0;
    const hit = hits[index];
    if (!hit) return;
    event.preventDefault();
    window.location.assign(productHref(hit));
  }

  function onScrim(event: MouseEvent) {
    if (event.target === event.currentTarget) close();
  }

  const status = !trimmed ? "" : hits.length === 0 ? `We don't stock "${trimmed}".` : `${hits.length} ${partNoun(hits.length)}`;

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
              <label for="catalog-search">Search parts</label>
            </h2>
            <button class="search-close" type="button" aria-label="Close search" onClick={close}>
              <svg width="20" height="20" aria-hidden="true" focusable="false">
                <use href="#close" />
              </svg>
            </button>
          </header>

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
                aria-expanded={hits.length > 0}
                aria-controls={hits.length > 0 ? "search-results" : undefined}
                aria-activedescendant={selected >= 0 ? `search-hit-${selected}` : undefined}
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                enterkeyhint="search"
                value={query}
                onInput={(event) => {
                  setQuery(event.currentTarget.value);
                  setActive(0);
                }}
              />
            </div>
          </div>

          <p class="sr-only" aria-live="polite">{hits.length > 0 ? status : ""}</p>

          {hits.length > 0 && (
            <div id="search-results" class="search-results" role="listbox" aria-label="Parts">
              {hits.map((part, index) => (
                <a
                  key={part.part_number}
                  id={`search-hit-${index}`}
                  class="search-hit"
                  role="option"
                  aria-selected={index === selected}
                  href={productHref(part)}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                >
                  <span class="search-photo">
                    {part.image ? (
                      <img src={part.image} alt="" width="56" height="56" decoding="async" />
                    ) : (
                      <span class="search-photo-fallback">{part.package_type}</span>
                    )}
                  </span>
                  <span class="search-part">{part.part_number}</span>
                  <span class="search-job">{part.name}</span>
                  <span class="search-price">{formatPkr(part.price)}</span>
                  <span class={`search-stock ${stockLevel(part.stock_qty)}`}>{stockLabel(part.stock_qty, part.restock_on)}</span>
                </a>
              ))}
            </div>
          )}

          {trimmed && hits.length === 0 && (
            <div class="search-miss">
              <p class="search-miss-copy" role="status">{status}</p>
              {whatsapp && (
                <a class="search-source" href={sourcingHref(whatsapp, trimmed)} target="_blank" rel="noopener noreferrer">
                  {sourcingOffer}
                </a>
              )}
              <p class="search-cats-label" id="search-categories">Categories</p>
              <nav class="search-cats" aria-labelledby="search-categories">
                {categories.map((category) => (
                  <a key={category.name} href={category.href}>
                    {category.name}
                    <span class="search-count">{category.count}</span>
                  </a>
                ))}
              </nav>
            </div>
          )}
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
        aria-keyshortcuts="/"
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
