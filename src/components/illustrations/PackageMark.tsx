import "./package-mark.css";
import { packageSvg, resolveKind, type PackageKind } from "./packages";

type Props = {
  kind: PackageKind;
  /** Package name, read by assistive tech. Omitted when the drawing is decorative. */
  label?: string;
  /** Larger inset for the product gallery well. */
  stage?: boolean;
  /** Decorative mark above an empty-state sentence. */
  empty?: boolean;
};

export default function PackageMark({ kind, label, stage = false, empty = false }: Props) {
  const svg = <span dangerouslySetInnerHTML={{ __html: packageSvg(kind) }} />;
  if (empty) {
    return (
      <span class="empty-mark" aria-hidden="true">
        {svg}
      </span>
    );
  }
  return (
    <span class={stage ? "pkg-fallback is-stage" : "pkg-fallback"}>
      {svg}
      {label ? <span class="sr-only">{label}</span> : null}
    </span>
  );
}

/** No-photo well. Unknown package names keep the text fallback. */
export function PackageFallback({
  packageType,
  partNumber,
  textClass,
}: {
  packageType?: string;
  partNumber?: string;
  textClass: string;
}) {
  const kind = resolveKind(packageType, partNumber);
  if (!kind) return <span class={textClass}>{packageType ?? ""}</span>;
  return <PackageMark kind={kind} label={packageType} />;
}
