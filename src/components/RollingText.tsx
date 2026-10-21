import { useEffect, useRef, useState } from "preact/hooks";
import { motionMs, prefersReducedMotion } from "../lib/connect";

type Props = {
  value: string;
};

/**
 * One roll from the previous text to the next. Digits do not count through.
 * docs/motion.md interaction 14 and 18. Reduced motion swaps immediately.
 */
export default function RollingText({ value }: Props) {
  const shown = useRef(value);
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    if (value === shown.current) return;
    const from = shown.current;
    shown.current = value;
    if (prefersReducedMotion()) {
      setPrevious(null);
      setCurrent(value);
      return;
    }
    setPrevious(from);
    setCurrent(value);
    const timer = window.setTimeout(() => setPrevious(null), motionMs("--dur-1", 120));
    return () => window.clearTimeout(timer);
  }, [value]);

  const length = Math.max(previous?.length ?? 0, current.length);
  const cells = [];
  for (let index = 0; index < length; index++) {
    const fromEnd = length - 1 - index;
    const next = current[current.length - 1 - fromEnd] ?? "";
    const prev = previous == null ? null : (previous[previous.length - 1 - fromEnd] ?? "");
    if (next === "" && (prev == null || prev === "")) continue;
    const changed = prev != null && prev !== next;
    cells.push(
      <span class="roll-cell" key={fromEnd}>
        {changed && prev !== "" && (
          <span class="roll-out" aria-hidden="true">{prev}</span>
        )}
        {next !== "" && <span class={changed ? "roll-in" : undefined}>{next}</span>}
      </span>,
    );
  }

  return <span class="roll">{cells}</span>;
}
