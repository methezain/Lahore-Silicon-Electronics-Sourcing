import { addToCart } from '../store/cartStore';

type Props = {
  part_number: string;
  name: string;
  price: number;
  image?: string;
  in_stock: boolean;
};

export default function AddToCartButton({ part_number, name, price, image, in_stock }: Props) {
  if (!in_stock) {
    return (
      <button 
        disabled
        class="w-full bg-brand-500 text-brand-50 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors shadow-sm opacity-50 cursor-not-allowed"
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button 
      onClick={() => addToCart({ part_number, name, price, image })}
      class="w-full bg-brand-500 text-brand-50 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-brand-900 transition-colors shadow-sm"
    >
      Add to Cart
    </button>
  );
}
