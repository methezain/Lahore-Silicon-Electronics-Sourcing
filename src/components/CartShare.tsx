import { useEffect, useState } from "preact/hooks";
import "./parts-preview.css";
import { cartHref, cartWhatsAppText, type CartLinkLine } from "../lib/cart-link";
import { copiedAction, shopName, whatsappHref } from "../lib/shop";
import { toast } from "../lib/toast";

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
      toast("Could not copy. Select the link and copy it.", "error");
    }
  }

  return (
    <div class="cart-share">
      <button type="button" class="cart-share-copy copy-share" data-state={copied ? "copied" : undefined} onClick={copy}>
        <span class="copy-ico" aria-hidden="true">
          <svg class="copy-glyph" viewBox="0 0 24 24" focusable="false">
            <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 15H5a1 1 0 0 1-1-1V4h10v2" />
          </svg>
          <svg class="copy-check" viewBox="0 0 24 24" focusable="false"><use href="#check" /></svg>
        </span>
        <span>{copied ? copiedAction : COPY_LABEL}</span>
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
