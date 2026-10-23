/** Copy buttons: clipboard write, glyph-to-check morph, live-region text, toast on failure. */
import { toast } from "./toast";

const REVERT_MS = 2000;

export function bindCopyButtons(root: ParentNode = document): void {
  const status = document.getElementById("copy-status");
  root.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    let timer = 0;
    btn.addEventListener("click", async () => {
      const idle = btn.dataset.idle ?? "Copy";
      const done = btn.dataset.done ?? "Copied";
      try {
        await navigator.clipboard.writeText(btn.dataset.copy ?? "");
      } catch {
        toast("Could not copy. Select the text and copy it.", "error");
        return;
      }
      const label = btn.querySelector(".copy-text");
      if (label) label.textContent = done;
      btn.dataset.state = "copied";
      btn.setAttribute("aria-label", done);
      if (status) status.textContent = done;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (label) label.textContent = idle;
        delete btn.dataset.state;
        btn.setAttribute("aria-label", `${idle} ${btn.dataset.label ?? ""}`.trim());
        if (status) status.textContent = "";
      }, REVERT_MS);
    });
  });
}
