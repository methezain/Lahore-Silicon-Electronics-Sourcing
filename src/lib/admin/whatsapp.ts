import { formatPkr } from "../money";
import { receiptLines } from "../order";
import { shopName } from "../shop";

export type MessageOrder = {
  id: string;
  customer_name: string;
  phone: string;
  total_price: number;
  status: string;
  items_json: string;
  payment_ref: string | null;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Digits for wa.me, or null when the stored phone is not a usable number. */
export function waDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

/** Only facts the order row proves. No dates, tracking numbers or promises. */
export function buyerMessage(order: MessageOrder, name = shopName()): string {
  const greeting = `Hi ${firstName(order.customer_name)}, this is ${name}.`.replace("Hi ,", "Hi,");
  const lines = receiptLines(order.items_json);
  const parts = lines ? lines.map((line) => `${line.quantity} × ${line.part_number}`).join(", ") : null;
  switch (order.status) {
    case "Pending": {
      const ref = order.payment_ref ? ` We are checking your payment reference ${order.payment_ref}.` : " We are checking your payment.";
      const what = parts ? ` ${parts}.` : "";
      return `${greeting} We have your order ${order.id}.${what} Total ${formatPkr(order.total_price)}.${ref} We will confirm here.`;
    }
    case "Paid":
      return `${greeting} Your payment for order ${order.id} is confirmed. We will message you here when it is dispatched.`;
    case "Dispatched":
      return `${greeting} Your order ${order.id} has been dispatched.`;
    case "Delivered":
      return `${greeting} Your order ${order.id} is marked delivered. Reply here if anything is wrong.`;
    case "Cancelled":
      return `${greeting} Your order ${order.id} was cancelled. Reply here if you have questions.`;
    default:
      return `${greeting} About your order ${order.id}.`;
  }
}

export function buyerWhatsAppHref(order: MessageOrder, name = shopName()): string | null {
  const digits = waDigits(order.phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(buyerMessage(order, name))}`;
}
