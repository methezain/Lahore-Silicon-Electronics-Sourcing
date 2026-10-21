import "./parts-preview.css";
import PhotoStage from "./PhotoStage";
import { formatPkr } from "../lib/money";
import { limitNote, previewSummary, type PartsListResult } from "../lib/parts-list";
import { stockLabel, stockLevel } from "../lib/stock";

type Props = {
  result: PartsListResult;
  idPrefix?: string;
  summaryId?: string;
};

export default function PartsPreview({ result, idPrefix = "parts", summaryId }: Props) {
  if (result.parsed.length === 0) return null;
  const matchesId = `${idPrefix}-matches`;
  const missesId = `${idPrefix}-misses`;

  return (
    <div class="parts-preview">
      <p id={summaryId} class="parts-summary" role="status" tabIndex={summaryId ? -1 : undefined}>
        {previewSummary(result)}
      </p>
      {result.matches.length > 0 && (
        <section aria-labelledby={matchesId}>
          <p class="parts-kicker" id={matchesId}>Matches</p>
          <ul class="parts-lines">
            {result.matches.map((match) => {
              const note = limitNote(match);
              return (
                <li key={match.part_number} class="parts-line">
                  <span class="parts-photo">
                    {match.image ? (
                      <PhotoStage cutout>
                        <img src={match.image} alt="" width="56" height="56" decoding="async" />
                      </PhotoStage>
                    ) : (
                      <span class="parts-photo-fallback">{match.package_type ?? ""}</span>
                    )}
                  </span>
                  <span class="parts-id">
                    <span class="parts-part">{match.part_number}</span>
                    <span class="parts-name">{match.name}</span>
                  </span>
                  <span class="parts-meta">
                    {match.price !== undefined && <span class="parts-price">{formatPkr(match.price)}</span>}
                    <span class={`parts-stock ${stockLevel(match.stock_qty)}`}>{stockLabel(match.stock_qty)}</span>
                  </span>
                  <span class="parts-qty">× {match.quantity}</span>
                  {note && <p class="parts-note">{note}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {result.misses.length > 0 && (
        <section aria-labelledby={missesId}>
          <p class="parts-kicker" id={missesId}>Not stocked</p>
          <ul class="parts-misses">
            {result.misses.map((miss) => (
              <li key={`${miss.line}-${miss.query}`}>
                <p class="parts-miss-copy">We don't stock "{miss.query}".</p>
                {miss.raw !== miss.query && <p class="parts-miss-raw">{miss.raw}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
