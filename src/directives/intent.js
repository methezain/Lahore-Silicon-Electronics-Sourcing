const POINTER = ["pointerover", "pointerdown", "touchstart", "focusin"];
const FALLBACK_MS = 15000;

/** @type {import('astro').ClientDirective} */
export default (load, options, el) => {
  const tokens = String((options && options.value) || "").split("|").map((token) => token.trim()).filter(Boolean);
  const events = tokens.filter((token) => token.startsWith("event:")).map((token) => token.slice(6));
  const shortcuts = tokens.includes("keys");
  const selector = tokens.filter((token) => token !== "keys" && !token.startsWith("event:")).join(", ");
  let started = false;
  let hydrated = false;
  let clicked = null;
  let key = null;

  const hit = (event) => selector !== "" && event.target instanceof Element && event.target.closest(selector) !== null;
  const isShortcut = (event) => event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");

  const onPointer = (event) => { if (hit(event)) void start(event); };
  const onKey = (event) => { if (shortcuts && isShortcut(event)) void start(event); };
  const onEvent = () => void start(null);
  const onClick = (event) => { if (!hydrated && hit(event)) clicked = event.target; };

  const detach = () => {
    for (const name of POINTER) document.removeEventListener(name, onPointer, true);
    document.removeEventListener("keydown", onKey, true);
    for (const name of events) document.removeEventListener(name, onEvent, true);
  };

  async function start(event) {
    if (started) return;
    started = true;
    detach();
    if (event && event.type === "keydown") key = event;
    const hydrate = await load();
    await hydrate();
    hydrated = true;
    document.removeEventListener("click", onClick, true);
    if (clicked && clicked.isConnected) clicked.click();
    else if (key) {
      const { type, key: value, code, ctrlKey, metaKey, altKey, shiftKey } = key;
      (key.target || document).dispatchEvent(new KeyboardEvent(type, { key: value, code, ctrlKey, metaKey, altKey, shiftKey, bubbles: true, cancelable: true }));
    }
  }

  document.addEventListener("click", onClick, true);
  for (const name of POINTER) document.addEventListener(name, onPointer, { capture: true, passive: true });
  document.addEventListener("keydown", onKey, true);
  for (const name of events) document.addEventListener(name, onEvent, true);
  window.setTimeout(() => void start(null), FALLBACK_MS);
};
