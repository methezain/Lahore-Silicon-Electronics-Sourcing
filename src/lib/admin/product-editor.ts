const SIZES = [112, 640, 1024] as const;
const MIN_SIDE = 400;
const SOFT_SIDE = 800;

function el<T extends HTMLElement>(root: Element, selector: string): T | null {
  return root.querySelector<T>(selector);
}

async function variant(bitmap: ImageBitmap, size: number): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("webp");
  return { blob, width, height };
}

/** Average brightness of the four corners, 0 to 1. A dark corner suggests a dark backdrop. */
function cornerBrightness(bitmap: ImageBitmap): number {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return 1;
  context.drawImage(bitmap, 0, 0, 32, 32);
  const spots: [number, number][] = [[0, 0], [28, 0], [0, 28], [28, 28]];
  let total = 0;
  for (const [x, y] of spots) {
    const data = context.getImageData(x, y, 4, 4).data;
    for (let i = 0; i < data.length; i += 4) total += (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
  }
  return total / (4 * 16);
}

function upload(body: FormData, onProgress: (fraction: number) => void): Promise<{ key: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/admin/media/upload");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener("load", () => {
      let parsed: { key?: string; width?: number; height?: number; error?: string } = {};
      try {
        parsed = JSON.parse(request.responseText);
      } catch {
        parsed = {};
      }
      if (request.status === 200 && parsed.key && parsed.width && parsed.height) resolve({ key: parsed.key, width: parsed.width, height: parsed.height });
      else reject(new Error(parsed.error ?? "The photo was not saved. Try again."));
    });
    request.addEventListener("error", () => reject(new Error("The photo did not upload. Check the connection.")));
    request.send(body);
  });
}

export function mountProductEditor(form: HTMLFormElement): void {
  const status = el<HTMLElement>(form, "#upload-status");
  const bar = el<HTMLElement>(form, "[data-savebar]");
  const barText = el<HTMLElement>(form, "[data-save-text]");
  const photos = el<HTMLElement>(form, "[data-photos]");
  const input = el<HTMLInputElement>(form, "#photo-input");

  const markDirty = () => {
    if (bar) bar.dataset.dirty = "true";
    if (barText && barText.textContent === "No changes yet") barText.textContent = "Unsaved changes";
  };
  form.addEventListener("input", markDirty);
  form.addEventListener("change", markDirty);

  const refreshHero = () => {
    photos?.querySelectorAll<HTMLElement>("[data-photo]").forEach((item, index) => {
      const chip = el<HTMLElement>(item, "[data-hero]");
      if (chip) chip.hidden = index !== 0;
    });
  };

  const keySpecs = el<HTMLElement>(form, "[data-key-specs]");
  const syncKeySpecs = () => {
    if (!keySpecs) return;
    const labels = [...form.querySelectorAll<HTMLInputElement>('[data-rows="spec"] input[name="spec_label"]')].map((field) => field.value.trim()).filter(Boolean);
    const picked = new Set([...keySpecs.querySelectorAll<HTMLInputElement>("input:checked")].map((box) => box.value));
    keySpecs.replaceChildren();
    for (const label of [...new Set(labels)]) {
      const wrap = document.createElement("label");
      wrap.className = "check";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.name = "key_spec";
      box.value = label;
      box.checked = picked.has(label);
      const text = document.createElement("span");
      text.textContent = label;
      wrap.appendChild(box);
      wrap.appendChild(text);
      keySpecs.appendChild(wrap);
    }
  };
  form.querySelector('[data-rows="spec"]')?.addEventListener("change", syncKeySpecs);

  for (const [button, template, rows] of [["#add-spec", "#row-spec", "spec"], ["#add-pin", "#row-pin", "pin"], ["#add-faq", "#row-faq", "faq"]] as const) {
    el<HTMLElement>(form, button)?.addEventListener("click", () => {
      const source = document.querySelector<HTMLTemplateElement>(template);
      const target = form.querySelector(`[data-rows="${rows}"]`);
      if (!source || !target) return;
      const row = source.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
      if (!row) return;
      target.appendChild(row);
      row.querySelector<HTMLInputElement>("input")?.focus();
      markDirty();
    });
  }

  form.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLElement>("[data-remove]");
    if (remove) {
      const row = remove.closest("[data-row]");
      row?.querySelectorAll<HTMLInputElement>("input").forEach((field) => (field.value = ""));
      row?.remove();
      syncKeySpecs();
      markDirty();
      return;
    }
    const photo = target.closest<HTMLElement>("[data-photo]");
    if (!photo) return;
    if (target.closest("[data-remove-photo]")) {
      photo.remove();
      refreshHero();
      markDirty();
    }
    const move = target.closest<HTMLElement>("[data-move]");
    if (move) {
      const step = Number(move.dataset.move);
      const sibling = step < 0 ? photo.previousElementSibling : photo.nextElementSibling;
      if (sibling) {
        photo.parentNode?.insertBefore(photo, step < 0 ? sibling : sibling.nextSibling);
        refreshHero();
        markDirty();
      }
    }
  });

  const say = (message: string) => {
    if (status) status.textContent = message;
  };

  function addTile(done: { key: string; width: number; height: number }): void {
    if (!photos) return;
    const item = document.createElement("li");
    item.className = "photo";
    item.dataset.photo = "";
    const hidden = (name: string, value: string) => {
      const field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.value = value;
      return field;
    };
    const frame = document.createElement("span");
    frame.className = "frame";
    const image = document.createElement("img");
    image.src = `/media/${done.key}-112.webp`;
    image.alt = "";
    image.width = 104;
    image.height = 104;
    frame.appendChild(image);
    const chip = document.createElement("span");
    chip.className = "chip hero-chip";
    chip.dataset.hero = "";
    const alt = document.createElement("input");
    alt.className = "in";
    alt.name = "image_alt";
    alt.placeholder = "Describe the photo";
    alt.setAttribute("aria-label", "New photo description");
    const note = document.createElement("input");
    note.className = "in";
    note.name = "image_note";
    note.placeholder = "Note (optional)";
    note.setAttribute("aria-label", "New photo note");
    const tools = document.createElement("span");
    tools.className = "photo-tools";
    for (const [label, attr, value] of [["←", "data-move", "-1"], ["→", "data-move", "1"], ["Remove", "data-remove-photo", ""]] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute(attr, value);
      tools.appendChild(button);
    }
    chip.textContent = "Main";
    for (const node of [hidden("image_src", `media:${done.key}`), hidden("image_w", String(done.width)), hidden("image_h", String(done.height)), frame, chip, alt, note, tools]) item.appendChild(node);
    photos.appendChild(item);
    refreshHero();
    alt.focus();
  }

  input?.addEventListener("change", async () => {
    const files = [...(input.files ?? [])];
    input.value = "";
    const partNumber = el<HTMLInputElement>(form, "#f-part_number")?.value.trim() ?? "";
    for (const [index, file] of files.entries()) {
      const label = `Photo ${index + 1} of ${files.length}`;
      try {
        say(`${label}: reading…`);
        const bitmap = await createImageBitmap(file);
        const short = Math.min(bitmap.width, bitmap.height);
        if (short < MIN_SIDE) {
          say(`${label} is too small (${bitmap.width}×${bitmap.height}). Use a photo at least ${MIN_SIDE}px on the short side.`);
          continue;
        }
        const warnings: string[] = [];
        if (short < SOFT_SIDE) warnings.push("It is small and may look soft.");
        const ratio = bitmap.width / bitmap.height;
        if (ratio > 1.3 || ratio < 0.77) warnings.push("It is not close to square.");
        if (cornerBrightness(bitmap) < 0.4) warnings.push("The background looks dark. A plain light background works best.");

        const body = new FormData();
        let final = { width: 0, height: 0 };
        for (const size of SIZES) {
          const made = await variant(bitmap, size);
          body.append(`w${size}`, made.blob, `w${size}.webp`);
          if (size === 1024) final = made;
        }
        body.append("width", String(final.width));
        body.append("height", String(final.height));
        body.append("part_number", partNumber);
        const done = await upload(body, (fraction) => say(`${label}: uploading ${Math.round(fraction * 100)}%`));
        addTile(done);
        markDirty();
        say(warnings.length ? `${label} added. ${warnings.join(" ")}` : `${label} added. Describe it before saving.`);
      } catch (error) {
        say(error instanceof Error && error.message ? `${label}: ${error.message}` : `${label} could not be read.`);
      }
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (bar?.dataset.dirty === "true" && !form.dataset.submitting) event.preventDefault();
  });
  form.addEventListener("submit", () => {
    form.dataset.submitting = "true";
  });
}
