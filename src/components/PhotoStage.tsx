/**
 * One stage for every part photograph.
 * Cut-out on a top-lit surface → sunken well, contact shadow, 1:1, even inset.
 * docs/design-system.md section 7 and docs/premium-roadmap.md R2.
 * Islands cannot import an Astro file, so cart, search, and checkout use this.
 */
import type { ComponentChildren } from "preact";
import "./photo-stage.css";

interface Props {
  children: ComponentChildren;
  /** Transparent cut-out. Adds the inset and the contact shadow. */
  cutout?: boolean;
}

export default function PhotoStage({ children, cutout = false }: Props) {
  return (
    <span class={cutout ? "photo-stage is-cutout" : "photo-stage"}>
      <span class="photo-stage-fit">{children}</span>
    </span>
  );
}
