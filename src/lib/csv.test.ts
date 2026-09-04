import { describe, expect, it } from "vitest";

import { escapeCsvCell, neutraliseFormula, toCsv, toCsvRow } from "./csv";

describe("escapeCsvCell", () => {
  it("leaves ordinary text alone", () => {
    expect(escapeCsvCell("Caritas Sudan")).toBe("Caritas Sudan");
  });

  it("quotes cells containing a comma", () => {
    expect(escapeCsvCell("Goma, North Kivu")).toBe('"Goma, North Kivu"');
  });

  it("doubles internal quotes", () => {
    expect(escapeCsvCell('He said "thanks"')).toBe('"He said ""thanks"""');
  });

  it("quotes cells containing newlines", () => {
    expect(escapeCsvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("renders null and undefined as empty", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("formula injection", () => {
  // A partner name or description is free text entered through the admin, so
  // it can reach a reader's spreadsheet. Quoting alone does not help: Excel
  // strips the quotes and evaluates what is inside.
  it.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralises a cell starting with %j",
    (trigger) => {
      expect(neutraliseFormula(`${trigger}SUM(A1:A9)`)).toBe(`'${trigger}SUM(A1:A9)`);
    },
  );

  it("neutralises a HYPERLINK payload in a partner name", () => {
    const attack = '=HYPERLINK("http://evil.example","Click")';
    const cell = escapeCsvCell(attack);

    expect(cell.startsWith("'") || cell.startsWith('"\'')).toBe(true);
    expect(cell).not.toMatch(/^"?=/);
  });

  it("still quotes a neutralised cell that also contains a comma", () => {
    expect(escapeCsvCell("=1,2")).toBe(`"'=1,2"`);
  });

  it("does not touch a negative number that is not leading a cell", () => {
    expect(escapeCsvCell("balance -5")).toBe("balance -5");
  });

  it("neutralises a leading minus, since a spreadsheet reads it as a formula", () => {
    expect(escapeCsvCell("-5")).toBe("'-5");
  });
});

describe("toCsv", () => {
  it("emits a header row and CRLF line endings", () => {
    const csv = toCsv(["Date", "Amount"], [["2026-01-01", "10.00"]], { bom: false });
    expect(csv).toBe("Date,Amount\r\n2026-01-01,10.00");
  });

  it("prefixes a UTF-8 BOM by default so Excel reads accents correctly", () => {
    const csv = toCsv(["Partner"], [["Caritas Côte d'Ivoire"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Côte");
  });

  it("round-trips a row containing every awkward character at once", () => {
    const row = ['=cmd', 'a,b', 'say "hi"', "multi\nline"];
    const line = toCsvRow(row);
    expect(line).toBe(`'=cmd,"a,b","say ""hi""","multi\nline"`);
  });
});
