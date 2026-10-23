/** Shows the offline banner while the browser reports no network, and toasts the return. */
import { toast } from "./toast";

export function bindOffline(): void {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;
  const retry = banner.querySelector<HTMLButtonElement>("[data-offline-retry]");
  let wasOffline = false;
  const sync = () => {
    const offline = !navigator.onLine;
    banner.hidden = !offline;
    if (wasOffline && !offline) toast("Back online.");
    wasOffline = offline;
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  retry?.addEventListener("click", () => {
    if (navigator.onLine) sync();
    else toast("Still offline. Your cart stays on this device.", "error");
  });
  sync();
}
