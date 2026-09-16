import { describe, expect, it } from "vitest";
import { SMALL_PLANT_COLUMNS } from "./columns";
import { buildPdf, pdfHeaderNotes } from "./pdf";
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
      columns: SMALL_PLANT_COLUMNS,
    };
    const bytes = buildPdf(book);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdfHeaderNotes(book).join("\n")).not.toContain("Megômetro");
  });

  it("builds a grayscale PDF when printAppearance is mono", () => {
    const bytes = buildPdf({ ...createExampleWorkbook(), printAppearance: "mono" });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("prints instrument identification on the PDF header", () => {
    const book = createExampleWorkbook();
    const notes = pdfHeaderNotes(book).join("\n");
    expect(notes).toContain("Fluke 87V");
    expect(notes).toContain("36581234");
    expect(notes).toContain("RBC-2026-118");
    expect(notes).toContain("Megômetro");
    expect(buildPdf(book).byteLength).toBeGreaterThan(1000);
  });
});
