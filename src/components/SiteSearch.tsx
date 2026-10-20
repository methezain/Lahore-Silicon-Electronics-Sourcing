import { useState } from "preact/hooks";
import { searchCatalog, type SearchPart } from "../lib/catalog-search";

type Props = {
  parts: SearchPart[];
};

type PagefindHit = { url: string; title: string };

async function loadPagefind(): Promise<null | {
  search: (query: string) => Promise<{ results: { data: () => Promise<{ url?: string; meta?: { title?: string } }> }[] }>;
}> {
  try {
    const load = new Function("return import('/pagefind/pagefind.js')") as () => Promise<{
      init: () => Promise<void>;
      search: (query: string) => Promise<{ results: { data: () => Promise<{ url?: string; meta?: { title?: string } }> }[] }>;
    }>;
    const pagefind = await load();
    await pagefind.init();
    return pagefind;
  } catch {
    return null;
  }
}

export default function SiteSearch({ parts }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchPart[]>([]);
  const [extra, setExtra] = useState<PagefindHit[]>([]);
  const [exactMiss, setExactMiss] = useState(false);
  const [open, setOpen] = useState(false);

  async function run(value: string) {
    const local = searchCatalog(parts, value);
    setHits(local.hits);
    setExtra([]);
    setExactMiss(local.exactMiss);
    setOpen(value.trim().length > 0);

    const pagefind = await Promise.race([
      loadPagefind(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
    ]);
    if (!pagefind || !value.trim()) return;

    const found = await pagefind.search(value.trim());
    const extras: PagefindHit[] = [];
    for (const result of found.results.slice(0, 6)) {
      const data = await result.data();
      const url = data.url ?? "";
      const slug = url.split("/").filter(Boolean).pop()?.toLowerCase();
      const known = parts.some((part) => part.part_number.toLowerCase() === slug);
      if (!known && data.meta?.title) extras.push({ url, title: data.meta.title });
    }
    setExtra(extras);
    if (extras.length > 0) setExactMiss(false);
  }

  return (
    <div class="site-search">
      <label class="sr-only" for="catalog-search">Search</label>
      <input
        id="catalog-search"
        type="search"
        placeholder="LM7805"
        value={query}
        autocomplete="off"
        onInput={(event) => {
          const value = (event.currentTarget as HTMLInputElement).value;
          setQuery(value);
          void run(value);
        }}
      />
      {open && (
        <div class="site-search-results" role="listbox">
          {hits.map((part) => (
            <a href={`/product/${part.part_number.toLowerCase()}`}>
              <span class="mono">{part.part_number}</span>
              <span>{part.name}</span>
            </a>
          ))}
          {extra.map((hit) => (
            <a href={hit.url}>{hit.title}</a>
          ))}
          {exactMiss && <p>The shop does not sell {query.trim()}.</p>}
          {!exactMiss && hits.length === 0 && extra.length === 0 && <p>No parts match.</p>}
        </div>
      )}
    </div>
  );
}
