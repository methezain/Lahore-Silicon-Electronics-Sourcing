import { useEffect, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { cartStore, isCartDrawerOpen } from "../store/cartStore";
import { ADDED_HOLD_MS, connectPulse, prefersReducedMotion } from "../lib/connect";
import RollingText from "./RollingText";
import "./connect.css";

export default function CartButton() {
  const cartItems = useStore(cartStore);
  const pulse = useStore(connectPulse);
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(false);
  const [ring, setRing] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(
    () => isCartDrawerOpen.subscribe((open) => {
      if (open) document.dispatchEvent(new Event("lahore-cart-wanted"));
    }),
    [],
  );
  const partCount = ready ? Object.keys(cartItems).length : 0;
  const noun = partCount === 1 ? "part" : "parts";

  useEffect(() => {
    if (!ready || pulse < 1) return;
    const reduced = prefersReducedMotion();
    if (reduced) {
      setRing(false);
      setJoined(true);
      const timer = window.setTimeout(() => setJoined(false), ADDED_HOLD_MS);
      return () => window.clearTimeout(timer);
    }

    setJoined(false);
    setRing(false);
    let inner = 0;
    let release = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        setJoined(true);
        setRing(true);
        release = window.setTimeout(() => {
          setJoined(false);
          setRing(false);
        }, ADDED_HOLD_MS);
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
      window.clearTimeout(release);
    };
  }, [pulse, ready]);

  const plugClass = `cart-plug${joined ? " is-joined" : ""}${ring ? " is-ring" : ""}`;

  return (
    <button
      id="cart-button"
      class="cart-btn"
      type="button"
      data-ready={ready ? "true" : undefined}
      onClick={() => isCartDrawerOpen.set(true)}
    >
      <span class={plugClass}>
        <span class="cart-plug-ring" />
        <svg class="cart-plug-half is-left" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <use href="#plug-left" />
        </svg>
        <svg class="cart-plug-half is-right" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <use href="#plug-right" />
        </svg>
      </span>
      <span class="cart-btn-label">Cart </span>
      <span class="cart-count">{ready ? <RollingText value={String(partCount)} /> : "0"}</span>
      <span class="sr-only"> {noun}</span>
    </button>
  );
}
