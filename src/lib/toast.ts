/** Toasts. Success goes to the polite region, errors to the alert region. Both live in Layout.astro. */

type Tone = "ok" | "error";

const HOLD_MS = 3200;
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#check" /></svg>';
const ALERT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#alert" /></svg>';

export function toast(message: string, tone: Tone = "ok"): void {
  const region = document.getElementById(tone === "error" ? "toast-alert" : "toast-status");
  if (!region) return;
  const item = document.createElement("p");
  item.className = "toast";
  item.dataset.tone = tone;
  item.innerHTML = tone === "error" ? ALERT : CHECK;
  const text = document.createElement("span");
  text.textContent = message;
  item.appendChild(text);
  region.appendChild(item);
  const leave = () => {
    item.dataset.leaving = "";
    const done = () => item.remove();
    item.addEventListener("animationend", done, { once: true });
    window.setTimeout(done, 300);
  };
  window.setTimeout(leave, HOLD_MS);
}
