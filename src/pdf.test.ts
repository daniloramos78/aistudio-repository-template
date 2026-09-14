import { describe, expect, it } from "vitest";
import { buildPdf } from "./pdf";
import { createExampleWorkbook } from "./workbook";

describe("pdf", () => {
  it("builds a multi-page PDF for the example workbook", () => {
    const bytes = buildPdf(createExampleWorkbook());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});
