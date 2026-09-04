/**
 * CSV generation for the public ledger export.
 *
 * Two separate concerns are handled here, and conflating them is the usual bug:
 *
 * 1. *Quoting* — RFC 4180. A cell containing a comma, quote or newline is
 *    wrapped in double quotes with internal quotes doubled.
 *
 * 2. *Formula injection* — a spreadsheet treats a cell beginning with `=`,
 *    `+`, `-`, `@`, tab or CR as a formula, so a partner name of
 *    `=HYPERLINK("http://evil","click")` becomes executable content in the
 *    reader's Excel. Quoting does not prevent this: Excel strips the quotes
 *    and evaluates what is inside. The cell needs a literal prefix.
 *
 * Ledger rows contain partner names and free-text descriptions entered through
 * the admin, so both defences are required on every text cell.
 */

const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Prefix a leading formula trigger so spreadsheets treat the cell as text. */
export function neutraliseFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const raw = String(value);
  const safe = neutraliseFormula(raw);

  return NEEDS_QUOTING.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsvRow(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/**
 * Build a complete CSV document. CRLF line endings per RFC 4180, and a UTF-8
 * BOM so Excel on Windows reads accented partner names correctly instead of
 * rendering them as mojibake.
 */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly unknown[])[],
  { bom = true }: { bom?: boolean } = {},
): string {
  const body = [toCsvRow(header), ...rows.map(toCsvRow)].join("\r\n");
  return bom ? `﻿${body}` : body;
}
