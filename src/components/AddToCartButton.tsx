import { addToCart } from '../store/cartStore';

type Props = {
  part_number: string;
  name: string;
  image?: string;
  stock_qty: number;
  compact?: boolean;
};

export default function AddToCartButton({
  part_number,
  name,
  image,
  stock_qty,
  compact = false,
}: Props) {
  if (stock_qty < 1) return null;

  if (compact) {
    return (
      <button
        onClick={() => addToCart({ part_number, name, image })}
        title={`Add ${part_number} to cart`}
        style="width:36px;height:36px;border-radius:9999px;background:#007AAD;color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:filter 0.15s ease, transform 0.1s ease;"
        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)'; }}
        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => addToCart({ part_number, name, image })}
      style="width:100%;background:#007AAD;color:#ffffff;padding:1rem;border-radius:0.75rem;font-weight:700;font-size:0.875rem;text-transform:uppercase;letter-spacing:0.05em;border:none;cursor:pointer;transition:filter 0.15s ease, transform 0.1s ease;"
      onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
      onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
      onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
    >
      Add to Sourcing Order
    </button>
  );
}
