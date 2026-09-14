import { describe, expect, it } from "vitest";
import { buildPdf } from "./pdf";
import { createExampleWorkbook } from "./workbook";

describe("pdf", () => {
  it("builds a multi-page PDF for the example workbook", () => {
    const bytes = buildPdf(createExampleWorkbook());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    const asLatin = Buffer.from(bytes).toString("latin1");
    expect(asLatin).toContain("DejaVu");
    expect(asLatin).not.toMatch(/M\s*©/);
  });

  it("builds a PDF without the mesa column for small plants", () => {
    const book = {
      ...createExampleWorkbook(),
      columns: {
        mesa: false,
        stringNo: true,
        pv: true,
        mppt: true,
        tensaoVoc: true,
        polaridade: true,
        flutPositivo: true,
        flutNegativo: true,
        tensaoAplicada: true,
        isolamentoTempo: true,
        isolamentoMohm: true,
        isolamentoGohm: true,
      },
    };
    const bytes = buildPdf(book);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});
