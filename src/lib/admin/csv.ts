const FORMULA = /^[=+\-@\t\r]/;

/** A spreadsheet runs a cell that starts with these, so the cell gets a leading quote. */
export function neutralise(value: string): string {
  return FORMULA.test(value) ? `'${value}` : value;
}

export function csvCell(value: string | number | null | undefined): string {
  const text = neutralise(value === null || value === undefined ? "" : String(value));
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
