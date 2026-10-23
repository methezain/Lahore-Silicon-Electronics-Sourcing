/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SHOP_NAME?: string;
  readonly PUBLIC_SHOP_PHONE?: string;
  readonly PUBLIC_RAAST_ID?: string;
  readonly PUBLIC_RAAST_ACCOUNT_NAME?: string;
  readonly PUBLIC_RAAST_BANK?: string;
  readonly PUBLIC_JAZZCASH_NUMBER?: string;
  readonly PUBLIC_SADAPAY_NUMBER?: string;
  readonly PUBLIC_BANK_NAME?: string;
  readonly PUBLIC_BANK_ACCOUNT_TITLE?: string;
  readonly PUBLIC_BANK_ACCOUNT_NUMBER?: string;
  readonly PUBLIC_BANK_IBAN?: string;
  readonly PUBLIC_TURNSTILE_SITEKEY?: string;
}

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  size?: "normal" | "compact" | "flexible";
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface Window {
  turnstile?: {
    render(container: HTMLElement, options: TurnstileRenderOptions): string;
    reset(widgetId?: string): void;
    getResponse(widgetId?: string): string | undefined;
  };
}

declare namespace astroHTML.JSX {
  interface IntrinsicAttributes {
    'client:intent'?: string;
  }
}
