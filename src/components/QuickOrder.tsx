import { useEffect, useRef, useState } from "preact/hooks";
import CartShare from "./CartShare";
import PartsPreview from "./PartsPreview";
import { cartParamToText, parseCartParam } from "../lib/cart-link";
import { addLabel, addableMatches, resolvePartsList, resolveRequests, type PartsSource } from "../lib/parts-list";
import { connectHaptic } from "../lib/connect";
import { addLinesToCart, replaceCart } from "../store/cartStore";

export type QuickPart = PartsSource & {
  price: number;
  package_type: string;
};

type Props = {
  parts: QuickPart[];
  initialList?: string;
  initialCart?: string;
};

const PLACEHOLDER = "LM7805 x10\nNE555, 5\nams1117 3.3 - 20";

export default function QuickOrder({ parts, initialList = "", initialCart = "" }: Props) {
  const [text, setText] = useState(() => initialList || cartParamToText(initialCart));
  const applied = useRef(false);
  const result = resolvePartsList(text, parts);
  const adding = addableMatches(result);

  useEffect(() => {
    if (applied.current || !initialCart || initialList) return;
    applied.current = true;
    const requests = parseCartParam(initialCart).map((item, index) => ({
      line: index + 1,
      raw: `${item.part_number}:${item.quantity}`,
      query: item.part_number,
      quantity: item.quantity,
      explicit: true,
    }));
    const resolved = resolveRequests(requests, parts);
    replaceCart(resolved.matches.filter((match) => match.quantity > 0).map((match) => ({
      part_number: match.part_number,
      name: match.name,
      quantity: match.quantity,
      ...(match.image ? { image: match.image } : {}),
    })));
  }, [initialCart, initialList, parts]);

  function add() {
    if (adding.length === 0) return;
    addLinesToCart(adding.map((match) => ({
      part_number: match.part_number,
      name: match.name,
      quantity: match.quantity,
      ...(match.image ? { image: match.image } : {}),
    })));
    connectHaptic();
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    document.getElementById("quick-order-summary")?.focus();
  }

  return (
    <form class="sheet parts-order" method="get" action="/quick-order" onSubmit={onSubmit}>
      <div class="field">
        <label for="quick-order-list">Parts list</label>
        <textarea
          id="quick-order-list"
          class="control"
          name="list"
          rows={6}
          placeholder={PLACEHOLDER}
          value={text}
          spellcheck={false}
          autocapitalize="off"
          onInput={(event) => setText(event.currentTarget.value)}
        />
      </div>
      <div class="parts-actions">
        <button type="button" class="parts-primary" disabled={adding.length === 0} onClick={add}>
          {addLabel(adding.length)}
        </button>
        <button type="submit" class="parts-secondary">Review list</button>
      </div>
      <PartsPreview result={result} idPrefix="quick" summaryId="quick-order-summary" />
      <CartShare items={adding.map((match) => ({ part_number: match.part_number, quantity: match.quantity }))} />
    </form>
  );
}
