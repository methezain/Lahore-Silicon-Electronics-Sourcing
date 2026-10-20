/**
 * Operator contact and payment details.
 * These are public build-time variables (`PUBLIC_*`) because product pages are
 * prerendered and share the same header as the server-rendered pages.
 * A known placeholder is treated as unset so the panel is omitted.
 */

export type ShopPhone = {
  waDigits: string;
  display: string;
};

export type PaymentLine = {
  label: string;
  value: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  lines: PaymentLine[];
};

const KNOWN_FAKES = new Set([
  "923000000000",
  "03001234567",
  "3000000000",
  "0123456789012345",
  "pk45mezn000123456789",
]);

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function token(value: string): string {
  return value.replace(/[\s+\-()]/g, "").toLowerCase();
}

function readPublic(value: unknown): string | undefined {
  const trimmed = clean(value);
  if (!trimmed || KNOWN_FAKES.has(token(trimmed))) return undefined;
  return trimmed;
}

export function shopPhone(): ShopPhone | undefined {
  const raw = readPublic(import.meta.env.PUBLIC_SHOP_PHONE);
  if (!raw) return undefined;

  const waDigits = raw.replace(/\D/g, "");
  if (waDigits.length < 11 || waDigits.length > 15) return undefined;
  if (KNOWN_FAKES.has(waDigits)) return undefined;

  const display = raw.startsWith("+")
    ? raw
    : waDigits.startsWith("92") && waDigits.length === 12
      ? `+92 ${waDigits.slice(2, 5)} ${waDigits.slice(5)}`
      : `+${waDigits}`;

  return { waDigits, display };
}

export function whatsappHref(text?: string): string | undefined {
  const phone = shopPhone();
  if (!phone) return undefined;
  const base = `https://wa.me/${phone.waDigits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function paymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];

  const raastId = readPublic(import.meta.env.PUBLIC_RAAST_ID);
  if (raastId) {
    const lines: PaymentLine[] = [{ label: "Raast ID", value: raastId }];
    const accountName = readPublic(import.meta.env.PUBLIC_RAAST_ACCOUNT_NAME);
    const bank = readPublic(import.meta.env.PUBLIC_RAAST_BANK);
    if (accountName) lines.push({ label: "Account name", value: accountName });
    if (bank) lines.push({ label: "Bank", value: bank });
    methods.push({ id: "raast", label: "Raast", lines });
  }

  const bankName = readPublic(import.meta.env.PUBLIC_BANK_NAME);
  const accountNumber = readPublic(import.meta.env.PUBLIC_BANK_ACCOUNT_NUMBER);
  const iban = readPublic(import.meta.env.PUBLIC_BANK_IBAN);
  if (bankName && (accountNumber || iban)) {
    const lines: PaymentLine[] = [{ label: "Bank", value: bankName }];
    const title = readPublic(import.meta.env.PUBLIC_BANK_ACCOUNT_TITLE);
    if (title) lines.push({ label: "Account title", value: title });
    if (accountNumber) lines.push({ label: "Account number", value: accountNumber });
    if (iban) lines.push({ label: "IBAN", value: iban });
    methods.push({ id: "bank", label: bankName, lines });
  }

  return methods;
}
