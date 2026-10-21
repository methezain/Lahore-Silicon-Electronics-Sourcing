import { useEffect, useState } from "preact/hooks";
import "./parts-preview.css";
import { cartHref, cartWhatsAppText, type CartLinkLine } from "../lib/cart-link";
import { copiedAction, shopName, whatsappHref } from "../lib/shop";

type Props = {
  items: CartLinkLine[];
};

const COPY_LABEL = "Copy cart link";

export default function CartShare({ items }: Props) {
  const usable = items.filter((item) => item.quantity > 0);
  const key = usable.map((item) => `${item.part_number}:${item.quantity}`).join("|");
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);
  const [showField, setShowField] = useState(false);
  const wa = usable.length > 0 ? whatsappHref(cartWhatsAppText(shopName(), usable)) : undefined;

  useEffect(() => {
    if (usable.length === 0) {
      setHref("");
      return;
    }
    setHref(cartHref(window.location.origin, usable));
  }, [key]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (usable.length === 0) return null;

  async function copy() {
    const link = cartHref(window.location.origin, usable);
    setHref(link);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setShowField(false);
    } catch {
      setCopied(false);
      setShowField(true);
    }
  }

  return (
    <div class="cart-share">
      <button type="button" class="cart-share-copy" onClick={copy}>
        {copied ? copiedAction : COPY_LABEL}
      </button>
      {wa && (
        <a class="cart-share-wa" href={wa} target="_blank" rel="noopener noreferrer">
          Send cart on WhatsApp
        </a>
      )}
      {showField && href && (
        <input class="cart-share-field" readOnly value={href} aria-label="Cart link" />
      )}
      <p class="sr-only" aria-live="polite">{copied ? copiedAction : ""}</p>
    </div>
  );
}
