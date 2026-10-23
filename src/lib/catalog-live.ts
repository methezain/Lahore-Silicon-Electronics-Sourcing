/**
 * Client catalog filter and sort. docs/motion.md #2, #3, #4, #18.
 * Links stay real. This only intercepts a plain click.
 */
import {
  catalogHref,
  clampPage,
  columnSortLabel,
  columnSortState,
  compareCatalog,
  counterNoun,
  emptyCatalogCopy,
  matchesQuery,
  nextColumnSort,
  pageCount,
  pageSlice,
  pagerItems,
  parseCatalogQuery,
  parseCatalogSort,
  sameQuery,
  sortLabel,
  type CatalogMatch,
  type CatalogQuery,
  type CatalogRank,
} from "./catalog-query";

const ENTER_MS = 700;
const TYPING_MS = 160;

type ViewTransitionLike = { finished: Promise<void> };

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function read(el: HTMLElement): CatalogMatch & CatalogRank {
  return {
    part_number: el.dataset.part ?? "",
    name: el.dataset.name ?? "",
    category: el.dataset.category ?? "",
    keySpec: el.dataset.spec ?? "",
    price: Number(el.dataset.price ?? "0"),
    stock: Number(el.dataset.stock ?? "0"),
    order: Number(el.dataset.order ?? "0"),
  };
}

function canonical(root: HTMLElement): HTMLElement[] {
  const rows = [...root.querySelectorAll<HTMLElement>('[data-layout="list"] tbody tr[data-part]')];
  if (rows.length > 0) return rows;
  return [...root.querySelectorAll<HTMLElement>('[data-layout="grid"] li[data-part]')];
}

function reorder(container: Element | null, selector: string, order: readonly string[]) {
  if (!container) return;
  const map = new Map<string, HTMLElement>();
  for (const el of container.querySelectorAll<HTMLElement>(selector)) {
    const id = el.dataset.part ?? "";
    if (!map.has(id)) map.set(id, el);
  }
  const current = [...container.querySelectorAll<HTMLElement>(selector)].map((el) => el.dataset.part ?? "");
  const wanted = order.filter((id) => map.has(id));
  if (current.length === wanted.length && current.every((id, index) => id === wanted[index])) return;
  for (const id of order) {
    const el = map.get(id);
    if (el) container.appendChild(el);
  }
}

let rollToken = 0;

function rollCount(el: HTMLElement, next: string) {
  const prev = el.dataset.count ?? el.textContent ?? "";
  el.dataset.count = next;
  if (prev === next || reducedMotion()) {
    el.textContent = next;
    return;
  }
  const width = Math.max(prev.length, next.length);
  const oldText = prev.padStart(width, " ");
  const newText = next.padStart(width, " ");
  el.replaceChildren();
  let pending = 0;
  for (let index = 0; index < width; index += 1) {
    const digit = document.createElement("span");
    digit.className = "roll-digit";
    if (oldText[index] === newText[index]) {
      digit.textContent = newText[index] === " " ? "" : newText[index];
      el.appendChild(digit);
      continue;
    }
    pending += 1;
    const stack = document.createElement("span");
    stack.className = "roll-stack";
    const from = document.createElement("span");
    from.textContent = oldText[index] === " " ? "" : oldText[index];
    const to = document.createElement("span");
    to.textContent = newText[index] === " " ? "" : newText[index];
    stack.appendChild(from);
    stack.appendChild(to);
    digit.appendChild(stack);
    el.appendChild(digit);
  }
  if (pending === 0) {
    el.textContent = next;
    return;
  }
  const token = ++rollToken;
  el.addEventListener(
    "animationend",
    () => {
      if (token !== rollToken) return;
      el.textContent = el.dataset.count ?? next;
    },
    { once: true },
  );
}

function startTransition(root: HTMLElement, update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => ViewTransitionLike;
  };
  if (typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  root.classList.add("is-filtering");
  document.documentElement.classList.add("catalog-vt");
  let transition: ViewTransitionLike;
  try {
    transition = doc.startViewTransition(update);
  } catch {
    root.classList.remove("is-filtering");
    document.documentElement.classList.remove("catalog-vt");
    update();
    return;
  }
  const clear = () => {
    root.classList.remove("is-filtering");
    document.documentElement.classList.remove("catalog-vt");
  };
  transition.finished.then(clear, clear);
}

function renderPager(nav: HTMLElement, query: CatalogQuery, total: number) {
  const items = pagerItems(query.page, pageCount(total));
  nav.hidden = items.length === 0;
  const nodes = items.map((item) => {
    if (item.kind === "gap") {
      const gap = document.createElement("span");
      gap.className = "pager-gap";
      gap.setAttribute("aria-hidden", "true");
      gap.textContent = "…";
      return gap;
    }
    const link = document.createElement("a");
    link.className = item.kind === "page" ? "pager-link" : "pager-link pager-step";
    link.href = catalogHref({ ...query, page: item.page });
    link.dataset.page = String(item.page);
    if (item.kind === "page") {
      link.textContent = String(item.page);
      link.setAttribute("aria-label", `Page ${item.page}`);
      if (item.current) link.setAttribute("aria-current", "page");
    } else {
      link.textContent = item.kind === "prev" ? "Previous" : "Next";
      link.rel = item.kind;
    }
    return link;
  });
  nav.replaceChildren(...nodes);
}

function scrollToToolbar(root: HTMLElement) {
  const toolbar = root.querySelector<HTMLElement>(".toolbar");
  if (!toolbar) return;
  if (toolbar.getBoundingClientRect().top >= 0) return;
  toolbar.scrollIntoView({ block: "start", behavior: "instant" });
}

function endEntrance(root: HTMLElement) {
  const html = document.documentElement;
  html.classList.add("catalog-entered");
  root.classList.remove("is-enter");
  // List rows use their own first-visit flag. A filter must not replay it.
  delete html.dataset.listEnter;
}

export function mountCatalog(root: HTMLElement) {
  if (root.dataset.live === "true") return;
  root.dataset.live = "true";

  let state = parseCatalogQuery(new URLSearchParams(window.location.search));
  const form = root.querySelector<HTMLFormElement>("#catalog-filter");
  const input = root.querySelector<HTMLInputElement>("#catalog-q");
  const details = root.querySelector<HTMLDetailsElement>("#catalog-sort");

  window.setTimeout(() => endEntrance(root), ENTER_MS);

  function render(query: CatalogQuery) {
    const items = canonical(root);
    const ranked = [...items].sort((a, b) => compareCatalog(query.sort)(read(a), read(b)));
    const order = ranked.map((el) => el.dataset.part ?? "");
    const inCategory = query.category
      ? items.filter((el) => el.dataset.category === query.category).length
      : items.length;
    const matches = ranked.filter((el) => matchesQuery(read(el), query));
    const matched = matches.length;
    const page = clampPage(query.page, matched);
    if (page !== query.page) {
      query = { ...query, page };
      state = query;
    }
    const visible = new Set(pageSlice(matches, page).map((el) => el.dataset.part ?? ""));
    for (const el of root.querySelectorAll<HTMLElement>("[data-part]")) {
      const hide = !visible.has(el.dataset.part ?? "");
      if (el.hidden !== hide) el.hidden = hide;
    }

    reorder(root.querySelector('[data-layout="list"] tbody'), "tr[data-part]", order);
    reorder(root.querySelector('[data-layout="list"] .cat-cards'), ".cat-card[data-part]", order);
    reorder(root.querySelector('[data-layout="grid"] .grid'), "li[data-part]", order);

    const results = root.querySelector<HTMLElement>("#catalog-results");
    if (results) results.hidden = matched === 0 && items.length > 0;

    const empty = root.querySelector<HTMLElement>("#catalog-empty");
    const copy = emptyCatalogCopy(query, matched, inCategory);
    if (empty) {
      empty.hidden = copy === null;
      const text = empty.querySelector<HTMLElement>("[data-empty-text]");
      if (text && copy) text.textContent = copy;
      const show = empty.querySelector<HTMLAnchorElement>("[data-catalog-show]");
      if (show) {
        show.hidden = !query.category && !query.q;
        show.href = catalogHref({ category: null, sort: query.sort, q: "", page: 1 });
      }
    }

    const count = root.querySelector<HTMLElement>("#catalog-count");
    if (count) rollCount(count, String(matched));
    const rest = root.querySelector<HTMLElement>("#catalog-rest");
    if (rest) rest.textContent = ` ${counterNoun(matched)} on the counter`;

    const pager = root.querySelector<HTMLElement>("#catalog-pager");
    if (pager) renderPager(pager, query, matched);

    for (const link of root.querySelectorAll<HTMLAnchorElement>(".pills a")) {
      const category = link.dataset.category ? link.dataset.category : null;
      link.href = catalogHref({ ...query, category, page: 1 });
      if (category === query.category) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }

    const sortValue = root.querySelector<HTMLElement>("#catalog-sort-value");
    if (sortValue) sortValue.textContent = sortLabel(query.sort);
    for (const link of root.querySelectorAll<HTMLAnchorElement>(".sort-menu a")) {
      const sort = parseCatalogSort(link.dataset.sort ?? null);
      link.href = catalogHref({ ...query, sort, page: 1 });
      if (sort === query.sort) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }

    for (const th of root.querySelectorAll<HTMLElement>("th[data-sort-col]")) {
      const key = th.dataset.sortCol === "stock" ? "stock" : "price";
      const column = key === "stock" ? "Stock" : "Price";
      const columnState = columnSortState(query.sort, key);
      th.setAttribute("aria-sort", columnState);
      const link = th.querySelector("a");
      if (!link) continue;
      link.classList.toggle("is-sorted", columnState !== "none");
      link.setAttribute("aria-label", columnSortLabel(column, columnState));
      link.href = catalogHref({ ...query, sort: nextColumnSort(query.sort, key), page: 1 });
    }

    const categoryInput = form?.querySelector<HTMLInputElement>('input[name="category"]');
    if (categoryInput) {
      categoryInput.value = query.category ?? "";
      categoryInput.disabled = !query.category;
    }
    const sortInput = form?.querySelector<HTMLInputElement>('input[name="sort"]');
    if (sortInput) {
      sortInput.value = query.sort === "catalog" ? "" : query.sort;
      sortInput.disabled = query.sort === "catalog";
    }
    if (input && input.value.trim() !== query.q) input.value = query.q;

    const nextUrl = catalogHref(query, false);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) history.replaceState(null, "", nextUrl);
  }

  function apply(next: CatalogQuery, typing = false) {
    const query = { ...next, q: next.q.trim().slice(0, 80) };
    if (sameQuery(state, query)) return;
    state = query;
    endEntrance(root);
    if (typing && root.classList.contains("is-filtering")) {
      render(query);
      return;
    }
    startTransition(root, () => render(query));
  }

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const link = event.target.closest("a");
    if (!link || !root.contains(link)) return;

    if (link.closest(".pager")) {
      event.preventDefault();
      apply({ ...state, page: Number(link.dataset.page) || 1 });
      scrollToToolbar(root);
      return;
    }
    if (link.closest(".pills")) {
      event.preventDefault();
      const category = link.dataset.category ? link.dataset.category : null;
      apply({ ...state, category, page: 1 });
      return;
    }
    if (link.closest(".sort-menu")) {
      event.preventDefault();
      const sort = parseCatalogSort(link.dataset.sort ?? null);
      apply({ ...state, sort, page: 1 });
      if (details) details.open = false;
      return;
    }
    if (link.hasAttribute("data-catalog-show")) {
      event.preventDefault();
      if (input) input.value = "";
      apply({ ...state, category: null, q: "", page: 1 });
      return;
    }
    if (link.closest("th[data-sort-col]")) {
      event.preventDefault();
      const th = link.closest("th");
      const key = th?.dataset.sortCol === "stock" ? "stock" : "price";
      apply({ ...state, sort: nextColumnSort(state.sort, key), page: 1 });
    }
  });

  let typingTimer = 0;
  input?.addEventListener("input", () => {
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => apply({ ...state, q: input.value, page: 1 }, true), TYPING_MS);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(typingTimer);
    apply({ ...state, q: input?.value ?? "", page: 1 });
  });

  details?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && details.open) {
      event.preventDefault();
      event.stopPropagation();
      details.open = false;
      details.querySelector("summary")?.focus();
      return;
    }
    if (!details.open || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    const items = [...details.querySelectorAll<HTMLAnchorElement>(".sort-menu a")];
    if (items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    items[(index + delta + items.length) % items.length]?.focus();
  });

  document.addEventListener("click", (event) => {
    if (!details?.open) return;
    if (event.target instanceof Node && details.contains(event.target)) return;
    details.open = false;
  });

}
