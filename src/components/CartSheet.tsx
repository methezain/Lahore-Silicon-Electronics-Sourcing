import { useEffect, useRef, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import "./cart-sheet.css";
import PackageMark, { PackageFallback } from "./illustrations/PackageMark.tsx";
import PhotoStage from "./PhotoStage.tsx";
import CartShare from "./CartShare.tsx";
import { reconcileRows, type LinePhase, type LineRow } from "./cart-lines";
import {
  cssNumber,
  playSpring,
  prefersReducedMotion,
  readTranslateX,
  springFlick,
  springSmooth,
} from "./cart-motion";
import {
  addToCart,
  addedNotice,
  cartStore,
  isCartDrawerOpen,
  quantityNotes,
  removeFromCart,
  setQuantityNote,
  updateQuantity,
} from "../store/cartStore";
import { companionsForCart } from "../lib/cart-companions";
import { formatPkr, priceCart, unitPrice } from "../lib/money";
import { correctQuantity } from "../lib/quantity";
import { deliveryCost, returnRule } from "../lib/shipping";
import { stockLabel, stockLevel } from "../lib/stock";
import type { CatalogPart } from "../lib/catalog";

type Props = {
  catalog?: CatalogPart[];
};

type LineSnap = {
  name?: string;
  image?: string;
  packageType?: string;
  gone: boolean;
  quantity: number;
  amount?: string;
  multiple: number;
};

type Dismiss = {
  x: number;
  velocity: number;
  flick: boolean;
  hold: boolean;
};

const FLICK_VELOCITY = 650;

function focusableIn(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")].filter(
    (element) => element.tabIndex !== -1 && !element.closest("[inert]"),
  );
}

function partNoun(count: number) {
  return count === 1 ? "part" : "parts";
}

function noteId(partNumber: string) {
  return `cart-note-${partNumber.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function isInteractive(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, textarea, select, label"));
}

function photoMorphing() {
  return document.documentElement.classList.contains("is-connect-photo");
}

function clipClass(phase: LinePhase) {
  if (phase === "grow") return "cart-line-clip is-grow";
  if (phase === "collapse") return "cart-line-clip is-collapse";
  return "cart-line-clip";
}

function lineClass(row: LineRow) {
  const names = ["cart-line"];
  if (row.phase === "enter") names.push("is-enter", `is-enter-${row.index}`);
  if (row.phase === "slide") names.push("is-slide");
  if (row.phase === "collapse") names.push("is-out");
  return names.join(" ");
}

function RollingText({ value }: { value: string }) {
  const [shown, setShown] = useState(value);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const shownRef = useRef(value);
  const timer = useRef(0);

  useEffect(() => {
    if (value === shownRef.current) return;
    const previous = shownRef.current;
    shownRef.current = value;
    if (prefersReducedMotion()) {
      setOutgoing(null);
      setShown(value);
      return;
    }
    setOutgoing(previous);
    setShown(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOutgoing(null), cssNumber("--dur-fast", 140) + 40);
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span class="roll">
      {outgoing !== null && <span class="roll-out" aria-hidden="true">{outgoing}</span>}
      <span class={outgoing !== null ? "roll-in" : undefined}>{shown}</span>
    </span>
  );
}

export default function CartSheet({ catalog = [] }: Props) {
  const isOpen = useStore(isCartDrawerOpen);
  const cartItems = useStore(cartStore);
  const notice = useStore(addedNotice);
  const notes = useStore(quantityNotes);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const closeRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const dismissRef = useRef<Dismiss | null>(null);
  const xRef = useRef(0);
  const dragCleanup = useRef<(() => void) | null>(null);
  const leaveTimers = useRef(new Map<string, number[]>());
  const snaps = useRef(new Map<string, LineSnap>());
  const wasOpen = useRef(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<LineRow[]>([]);

  const items = ready ? Object.values(cartItems) : [];
  const noticeShown = ready ? notice : null;
  const open = ready && isOpen;
  const visible = open || held;
  openRef.current = open;

  const priced = priceCart(catalog, items);
  const byPart = new Map(priced.lines.map((line) => [line.part_number, line]));
  const rules = new Map(catalog.map((part) => [part.part_number, part]));
  const missing = new Set(priced.missing);
  const liveIds = items.map((item) => item.part_number);
  const itemKey = liveIds.join("\n");
  const reducedNow = ready && prefersReducedMotion();
  const shownRows = rows.length > 0 || !open
    ? rows
    : reconcileRows([], liveIds, reducedNow, noticeShown?.partNumber);
  const companions = companionsForCart(catalog, liveIds);

  for (const item of items) {
    const line = byPart.get(item.part_number);
    const rule = rules.get(item.part_number);
    snaps.current.set(item.part_number, {
      name: line?.name ?? item.name,
      image: rule?.image ?? item.image,
      packageType: rule?.package_type ?? "",
      gone: missing.has(item.part_number) || !rule,
      quantity: line?.quantity ?? item.quantity,
      amount: line ? formatPkr(line.line_total) : undefined,
      multiple: rule?.qty_multiple ?? 1,
    });
  }

  function clearLeave(partNumber: string) {
    const timers = leaveTimers.current.get(partNumber);
    if (!timers) return;
    for (const timer of timers) window.clearTimeout(timer);
    leaveTimers.current.delete(partNumber);
  }

  function close() {
    if (!openRef.current && !isCartDrawerOpen.get()) return;
    openRef.current = false;
    isCartDrawerOpen.set(false);
    addedNotice.set(null);
    const opener = document.getElementById("cart-button");
    opener?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      if (!openRef.current) opener?.focus({ preventScroll: true });
    });
  }
  closeRef.current = close;

  function commit(partNumber: string, raw: string) {
    const rule = rules.get(partNumber);
    if (!rule) return;
    const corrected = correctQuantity(Number(raw), rule);
    setQuantityNote(partNumber, corrected.message);
    setDrafts((current) => ({ ...current, [partNumber]: String(corrected.quantity) }));
    if (corrected.quantity < 1) removeFromCart(partNumber);
    else updateQuantity(partNumber, corrected.quantity);
  }

  function addCompanion(part: CatalogPart) {
    const corrected = correctQuantity(part.min_qty, part);
    if (corrected.quantity < 1) return;
    if (corrected.message) setQuantityNote(part.part_number, corrected.message);
    addToCart({ part_number: part.part_number, name: part.name, image: part.image }, corrected.quantity);
  }

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!openRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
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
      const active = document.activeElement;
      const inside = active instanceof Node && dialog.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return addedNotice.listen((next) => {
      if (!next) return;
      const status = document.getElementById("cart-status");
      if (status) status.textContent = `Added ${next.label ?? next.partNumber} to cart`;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const byNumber = new Map(catalog.map((part) => [part.part_number, part]));
    for (const item of Object.values(cartItems)) {
      const rule = byNumber.get(item.part_number);
      if (!rule) continue;
      const corrected = correctQuantity(item.quantity, rule);
      if (corrected.quantity === item.quantity) continue;
      if (corrected.message) setQuantityNote(item.part_number, corrected.message);
      if (corrected.quantity < 1) removeFromCart(item.part_number);
      else updateQuantity(item.part_number, corrected.quantity);
    }
  }, [cartItems, catalog, ready]);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    setHeld(true);
    if (wasOpen.current) return;
    wasOpen.current = true;
    const ids = itemKey ? itemKey.split("\n") : [];
    setRows((current) => (
      current.length > 0 ? current : reconcileRows([], ids, prefersReducedMotion(), notice?.partNumber)
    ));
  }, [open, itemKey, notice?.partNumber]);

  useEffect(() => {
    if (!visible) {
      setRows([]);
      for (const partNumber of [...leaveTimers.current.keys()]) clearLeave(partNumber);
    }
  }, [visible]);

  useEffect(() => {
    if (!open) return;
    const ids = itemKey ? itemKey.split("\n") : [];
    const reduced = prefersReducedMotion();
    for (const id of ids) clearLeave(id);
    setRows((current) => reconcileRows(current, ids, reduced, notice?.partNumber));
  }, [itemKey, open, notice?.partNumber]);

  useEffect(() => {
    if (!visible) return;
    for (const row of rows) {
      if (row.phase !== "slide" || leaveTimers.current.has(row.part_number)) continue;
      const partNumber = row.part_number;
      const slideMs = cssNumber("--dur-fast", 140);
      const collapseMs = cssNumber("--dur-base", 220);
      const slideTimer = window.setTimeout(() => {
        setRows((current) => current.map((item) => (
          item.part_number === partNumber && item.phase === "slide"
            ? { ...item, phase: "collapse" }
            : item
        )));
      }, slideMs);
      const doneTimer = window.setTimeout(() => {
        leaveTimers.current.delete(partNumber);
        setRows((current) => current.filter((item) => item.part_number !== partNumber));
      }, slideMs + collapseMs);
      leaveTimers.current.set(partNumber, [slideTimer, doneTimer]);
    }
  }, [rows, visible]);

  useEffect(() => () => {
    dragCleanup.current?.();
    stopRef.current();
    for (const timers of leaveTimers.current.values()) {
      for (const timer of timers) window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const panel = dialogRef.current;
    const scrim = scrimRef.current;
    const root = rootRef.current;
    if (!panel || !scrim || !root) return;

    let cancelled = false;
    const travel = () => panel.offsetWidth + cssNumber("--space-16", 16);
    const apply = (value: number) => {
      panel.style.transform = `translateX(${value}px)`;
      xRef.current = value;
      const distance = travel();
      scrim.style.transition = "none";
      const progress = distance <= 0 ? 1 : 1 - Math.min(1, Math.max(0, value / distance));
      scrim.style.opacity = String(progress);
    };
    const finishClose = () => {
      delete root.dataset.placed;
      panel.style.removeProperty("transform");
      scrim.style.removeProperty("opacity");
      scrim.style.removeProperty("transition");
      setPlaced(false);
      setMoving(false);
      setDragging(false);
      setHeld(false);
    };

    if (open && photoMorphing()) {
      panel.style.removeProperty("transform");
      scrim.style.removeProperty("opacity");
      root.dataset.placed = "true";
      setPlaced(true);
      setMoving(false);
      return;
    }

    if (prefersReducedMotion()) {
      if (open) {
        panel.style.removeProperty("transform");
        scrim.style.removeProperty("opacity");
        setPlaced(true);
        setMoving(false);
        return;
      }
      const dismiss = dismissRef.current;
      dismissRef.current = null;
      if (!dismiss?.hold) panel.style.removeProperty("transform");
      setPlaced(false);
      setMoving(false);
      let done = false;
      const finish = () => {
        if (done || cancelled) return;
        done = true;
        finishClose();
      };
      const onEnd = (event: AnimationEvent) => {
        if (event.animationName !== "cart-fade-out") return;
        finish();
      };
      root.addEventListener("animationend", onEnd);
      const timer = window.setTimeout(finish, cssNumber("--dur-1", 120) + 80);
      return () => {
        cancelled = true;
        root.removeEventListener("animationend", onEnd);
        window.clearTimeout(timer);
      };
    }

    if (open && root.dataset.placed === "true" && readTranslateX(panel.style.transform) === null) {
      setMoving(false);
      return;
    }

    setMoving(true);
    const begin = () => {
      if (cancelled) return;
      if (panel.offsetWidth === 0) {
        requestAnimationFrame(begin);
        return;
      }
      if (open) {
        const inline = readTranslateX(panel.style.transform);
        const from = inline ?? (root.dataset.placed === "true" ? 0 : travel());
        stopRef.current = playSpring(springSmooth, from, 0, 0, apply, () => {
          if (cancelled) return;
          xRef.current = 0;
          root.dataset.placed = "true";
          setPlaced(true);
          setMoving(false);
        });
        return;
      }
      const dismiss = dismissRef.current;
      dismissRef.current = null;
      const inline = readTranslateX(panel.style.transform);
      const from = dismiss?.x ?? inline ?? (root.dataset.placed === "true" ? 0 : 0);
      panel.style.transform = `translateX(${from}px)`;
      delete root.dataset.placed;
      setPlaced(false);
      const preset = dismiss?.flick ? springFlick : springSmooth;
      stopRef.current = playSpring(preset, from, travel(), dismiss?.velocity ?? 0, apply, () => {
        if (cancelled) return;
        finishClose();
      });
    };
    begin();
    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, [open, visible]);

  useEffect(() => {
    if (!placed) return;
    dialogRef.current?.style.removeProperty("transform");
    const scrim = scrimRef.current;
    if (!scrim) return;
    scrim.style.removeProperty("opacity");
    scrim.style.removeProperty("transition");
  }, [placed]);

  useEffect(() => {
    if (!open || !visible) return;
    openRef.current = true;
    closeButtonRef.current?.focus();

    function onFocusIn(event: FocusEvent) {
      if (!openRef.current) return;
      const dialog = dialogRef.current;
      const target = event.target;
      if (!dialog || (target instanceof Node && dialog.contains(target))) return;
      closeButtonRef.current?.focus();
    }

    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      // Hide commits before this cleanup. Restoring focus here survives the dialog losing focus.
      if (!openRef.current) document.getElementById("cart-button")?.focus({ preventScroll: true });
    };
  }, [open, visible]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  function onOverlayClick(event: MouseEvent) {
    const target = event.target;
    if (target === event.currentTarget) close();
    else if (target instanceof Element && target.classList.contains("cart-scrim")) close();
  }

  function onPanelPointerDown(event: PointerEvent) {
    if (event.button !== 0 || photoMorphing() || isInteractive(event.target)) return;
    const current = event.currentTarget;
    if (!(current instanceof HTMLElement)) return;
    const panel: HTMLElement = current;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = readTranslateX(panel.style.transform) ?? 0;
    let active = false;
    const samples = [{ x: startX, t: performance.now() }];

    function velocity() {
      const now = performance.now();
      const recent = samples.filter((sample) => now - sample.t <= 80);
      const first = recent[0];
      const last = recent[recent.length - 1];
      if (!first || !last || last.t === first.t) return 0;
      return ((last.x - first.x) / (last.t - first.t)) * 1000;
    }

    function paint(x: number) {
      panel.style.transform = `translateX(${x}px)`;
      xRef.current = x;
      const scrim = scrimRef.current;
      if (!scrim) return;
      const distance = panel.offsetWidth + cssNumber("--space-16", 16);
      scrim.style.transition = "none";
      scrim.style.opacity = String(distance <= 0 ? 1 : Math.min(1, Math.max(0, 1 - Math.max(0, x) / distance)));
    }

    function end(finish: boolean) {
      dragCleanup.current?.();
      dragCleanup.current = null;
      if (!active || !finish) return;
      const speed = velocity();
      const x = xRef.current;
      const width = panel.offsetWidth;
      const flick = Math.abs(speed) > FLICK_VELOCITY;
      const shouldClose = speed > FLICK_VELOCITY || (speed >= -FLICK_VELOCITY && x > width * 0.35);
      setDragging(false);
      if (prefersReducedMotion()) {
        if (shouldClose) {
          dismissRef.current = { x, velocity: 0, flick: false, hold: true };
          closeRef.current();
        } else {
          panel.style.removeProperty("transform");
          scrimRef.current?.style.removeProperty("opacity");
          scrimRef.current?.style.removeProperty("transition");
          if (rootRef.current) rootRef.current.dataset.placed = "true";
          setPlaced(true);
        }
        return;
      }
      if (shouldClose) {
        dismissRef.current = { x, velocity: speed, flick, hold: false };
        closeRef.current();
        return;
      }
      const root = rootRef.current;
      const scrim = scrimRef.current;
      stopRef.current = playSpring(flick ? springFlick : springSmooth, x, 0, speed, (value) => {
        panel.style.transform = `translateX(${value}px)`;
        xRef.current = value;
        if (!scrim) return;
        const distance = panel.offsetWidth + cssNumber("--space-16", 16);
        scrim.style.opacity = String(distance <= 0 ? 1 : Math.min(1, Math.max(0, 1 - Math.max(0, value) / distance)));
      }, () => {
        xRef.current = 0;
        if (root) root.dataset.placed = "true";
        setPlaced(true);
        setMoving(false);
      });
    }

    function move(ev: PointerEvent) {
      if (ev.pointerId !== event.pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!active) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          end(false);
          return;
        }
        active = true;
        stopRef.current();
        setDragging(true);
        setMoving(true);
        if (rootRef.current) delete rootRef.current.dataset.placed;
        setPlaced(false);
        panel.setPointerCapture(ev.pointerId);
      }
      ev.preventDefault();
      const raw = origin + dx;
      paint(raw < 0 ? raw * 0.22 : raw);
      samples.push({ x: ev.clientX, t: performance.now() });
    }

    function up(ev: PointerEvent) {
      if (ev.pointerId !== event.pointerId) return;
      end(true);
    }

    panel.addEventListener("pointermove", move);
    panel.addEventListener("pointerup", up);
    panel.addEventListener("pointercancel", up);
    dragCleanup.current = () => {
      panel.removeEventListener("pointermove", move);
      panel.removeEventListener("pointerup", up);
      panel.removeEventListener("pointercancel", up);
    };
  }

  return (
    <div
      ref={rootRef}
      class="cart-sheet"
      hidden={!visible}
      data-state={open ? "open" : "closed"}
      data-placed={placed ? "true" : undefined}
      data-moving={moving ? "true" : undefined}
      data-dragging={dragging ? "true" : undefined}
      onClick={onOverlayClick}
    >
      <div class="cart-scrim" ref={scrimRef} />
      <div
        ref={dialogRef}
        class="cart-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onPanelPointerDown}
      >
        <header class="cart-head">
          <h2 class="cart-heading">
            <span id="cart-title">Cart</span>
            <span class="cart-part-count">
              {ready ? <RollingText value={String(items.length)} /> : <span>0</span>}
              <span> {partNoun(items.length)}</span>
            </span>
          </h2>
          <button ref={closeButtonRef} class="cart-close" type="button" aria-label="Close cart" onClick={close}>
            <svg width="20" height="20" aria-hidden="true" focusable="false">
              <use href="#close" />
            </svg>
          </button>
        </header>
        {noticeShown && <p class="cart-added">
          <svg width="20" height="20" aria-hidden="true" focusable="false">
            <use href="#check" />
          </svg>
          Added {noticeShown.label ?? noticeShown.partNumber} to cart
        </p>}
        <div class="cart-lines">
          {shownRows.length === 0 ? (
            <p class="cart-empty">
              <PackageMark kind="module" empty />
              Your cart is empty. <a href="/">Browse the catalog.</a>
            </p>
          ) : (
            shownRows.map((row) => {
              const partNumber = row.part_number;
              const live = cartItems[partNumber];
              const snap = snaps.current.get(partNumber);
              const rule = rules.get(partNumber);
              const line = byPart.get(partNumber);
              const gone = live ? missing.has(partNumber) || !rule : snap?.gone ?? true;
              const quantity = live ? (line?.quantity ?? live.quantity) : snap?.quantity ?? 0;
              const shown = drafts[partNumber] ?? String(quantity);
              const note = notes[partNumber];
              const multiple = rule?.qty_multiple ?? snap?.multiple ?? 1;
              const amount = line ? formatPkr(line.line_total) : snap?.amount;
              const image = rule?.image ?? snap?.image;
              const packageType = rule?.package_type ?? snap?.packageType ?? "";
              const name = line?.name ?? snap?.name;
              const leaving = row.phase === "slide" || row.phase === "collapse";
              return (
                <div key={partNumber} class={clipClass(row.phase)} inert={leaving ? true : undefined}>
                  <div class="cart-line-fold">
                    <article class={lineClass(row)}>
                      <div class="cart-photo" data-connect-part={partNumber}>
                        {image ? (
                          <PhotoStage cutout>
                            <img src={image} alt="" width="64" height="64" loading="lazy" decoding="async" />
                          </PhotoStage>
                        ) : (
                          <PackageFallback packageType={packageType} partNumber={partNumber} textClass="cart-photo-fallback" />
                        )}
                      </div>
                      <div class="cart-copy">
                        <div class="cart-main">
                          <p class="cart-part">{partNumber}</p>
                          {name && <p class="cart-job">{name}</p>}
                          {gone && <p class="cart-missing" role="status">The shop no longer sells {partNumber}.</p>}
                          {!gone && (rule || snap) && (
                            <div class="qty-stepper is-compact">
                              <div class="qty-stepper-control">
                                <button
                                  type="button"
                                  aria-label={`Decrease ${partNumber}`}
                                  onClick={() => commit(partNumber, String(Number(shown) - multiple))}
                                >
                                  −
                                </button>
                                <input
                                  aria-label={`Quantity for ${partNumber}`}
                                  aria-describedby={note ? noteId(partNumber) : undefined}
                                  inputMode="numeric"
                                  autoComplete="off"
                                  spellcheck={false}
                                  value={shown}
                                  onInput={(event) => setDrafts((current) => ({
                                    ...current,
                                    [partNumber]: (event.currentTarget as HTMLInputElement).value,
                                  }))}
                                  onBlur={(event) => commit(partNumber, (event.currentTarget as HTMLInputElement).value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      commit(partNumber, (event.currentTarget as HTMLInputElement).value);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  aria-label={`Increase ${partNumber}`}
                                  onClick={() => commit(partNumber, String(Number(shown) + multiple))}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                          {note && <p id={noteId(partNumber)} class="cart-note" role="status">{note}</p>}
                        </div>
                        <div class="cart-side">
                          {amount && <p class="cart-amount"><RollingText value={amount} /></p>}
                          <button
                            type="button"
                            class="cart-remove"
                            onClick={() => {
                              setQuantityNote(partNumber);
                              removeFromCart(partNumber);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              );
            })
          )}
          {companions.length > 0 && (
            <section class="cart-companions" aria-labelledby="cart-companions-title">
              <h3 id="cart-companions-title" class="cart-companions-title">You will also need</h3>
              <ul class="cart-companion-list">
                {companions.map((part) => {
                  const corrected = correctQuantity(part.min_qty, part);
                  const canAdd = corrected.quantity > 0;
                  const price = formatPkr(unitPrice(part, canAdd ? corrected.quantity : 1));
                  const level = stockLevel(part.stock_qty);
                  return (
                    <li key={part.part_number} class="cart-companion">
                      <a class="cart-companion-link" href={`/product/${part.part_number.toLowerCase()}`}>
                        <span class="cart-photo">
                          {part.image ? (
                            <PhotoStage cutout>
                              <img src={part.image} alt="" width="64" height="64" loading="lazy" decoding="async" />
                            </PhotoStage>
                          ) : (
                            <PackageFallback
                              packageType={part.package_type}
                              partNumber={part.part_number}
                              textClass="cart-photo-fallback"
                            />
                          )}
                        </span>
                        <span class="cart-companion-copy">
                          <span class="cart-part">{part.part_number}</span>
                          <span class="cart-job">{part.name}</span>
                          <span class={`cart-stock ${level}`}>{stockLabel(part.stock_qty, part.restock_on)}</span>
                        </span>
                      </a>
                      <div class="cart-companion-side">
                        <p class="cart-amount">{price}</p>
                        {canAdd && (
                          <button
                            type="button"
                            class="cart-companion-add"
                            aria-label={`Add ${part.part_number} to cart`}
                            onClick={() => addCompanion(part)}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
        {items.length > 0 && (
          <footer class="cart-foot">
            <p class="cart-row">
              <span class="cart-label">Subtotal</span>
              <span class="cart-total-amount"><RollingText value={formatPkr(priced.total)} /></span>
            </p>
            <p class="cart-row">
              <span class="cart-label">Delivery</span>
              <span class="cart-rule">{deliveryCost}</span>
            </p>
            <p class="cart-return"><a href="/shipping-and-payments#defects">{returnRule}</a></p>
            <CartShare items={items.map((item) => ({ part_number: item.part_number, quantity: item.quantity }))} />
            {priced.lines.length > 0 && (
              <a class="cart-checkout" href="/checkout" data-astro-prefetch="false">
                <span>Check out</span>
                <span class="sr-only"> · </span>
                <RollingText value={formatPkr(priced.total)} />
              </a>
            )}
            <p class="cart-guest">Guest checkout. No account needed.</p>
          </footer>
        )}
      </div>
    </div>
  );
}

/** Dev gallery only. Replaces the cart in this browser with two catalog lines. */
export function CartSampleButton() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function open() {
    cartStore.set({
      LM7805: {
        part_number: "LM7805",
        name: "5 V, 1 A, TO-220 linear regulator",
        quantity: 1,
      },
      "ESP32-WROOM-32D": {
        part_number: "ESP32-WROOM-32D",
        name: "Wi-Fi and Bluetooth module, 3.3 V",
        quantity: 2,
      },
    });
    quantityNotes.set({});
    addedNotice.set({ partNumber: "LM7805", nonce: Date.now() });
    isCartDrawerOpen.set(true);
  }

  return (
    <button type="button" class="cart-sample" data-ready={ready ? "true" : undefined} onClick={open}>
      Open the cart sheet
    </button>
  );
}

export function CartEmptyButton() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function open() {
    cartStore.set({});
    quantityNotes.set({});
    addedNotice.set(null);
    isCartDrawerOpen.set(true);
  }

  return (
    <button type="button" class="cart-sample" data-ready={ready ? "true" : undefined} onClick={open}>
      Show the empty cart
    </button>
  );
}
