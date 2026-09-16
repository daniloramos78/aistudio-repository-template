import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS } from "./columns";
import { evaluateRow, isolationMegaohms, parseNumber } from "./verdict";
import { createEmptyWorkbook, emptyRow } from "./workbook";

describe("verdict", () => {
  const columns = DEFAULT_COLUMNS;
  const book = {
    ...createEmptyWorkbook(),
    vocEsperada: "1000",
    erroPercentual: "5",
    tensaoModulo: "46.7",
    criterioIsolacao: "nbr5410" as const,
  };

  it("parses voltages with comma, V and kV", () => {
    expect(parseNumber("45,9V")).toBeCloseTo(45.9);
    expect(parseNumber("1kV")).toBe(1000);
    expect(parseNumber("")).toBeNull();
  });

  it("approves Voc inside the percentage band", () => {
    const row = emptyRow({ tensaoVoc: "1015", polaridade: "Ok", flutPositivo: "45.9", flutNegativo: "45.2", isolamentoMohm: "1.2" });
    expect(evaluateRow(row, book, columns)).toBe("pass");
  });

  it("fails Voc outside the percentage band", () => {
    const row = emptyRow({ tensaoVoc: "1200", polaridade: "Ok", flutPositivo: "45.9", flutNegativo: "45.2", isolamentoMohm: "1.2" });
    expect(evaluateRow(row, book, columns)).toBe("fail");
  });

  it("fails floating if one pole exceeds the module voltage", () => {
    const row = emptyRow({
      tensaoVoc: "1000",
      polaridade: "Ok",
      flutPositivo: "45.9",
      flutNegativo: "48.0",
      isolamentoMohm: "2",
    });
    expect(evaluateRow(row, book, columns)).toBe("fail");
  });

  it("approves floating when both poles are below the module voltage", () => {
    const row = emptyRow({
      tensaoVoc: "1000",
      polaridade: "Ok",
      flutPositivo: "45.9",
      flutNegativo: "44.1",
      isolamentoMohm: "2",
    });
    expect(evaluateRow(row, book, columns)).toBe("pass");
  });

  it("fails polarity Nok even if the rest passes", () => {
    const row = emptyRow({
      tensaoVoc: "1000",
      polaridade: "Nok",
      flutPositivo: "45.9",
      flutNegativo: "44.1",
      isolamentoMohm: "2",
    });
    expect(evaluateRow(row, book, columns)).toBe("fail");
  });

  it("combines MΩ, GΩ and TΩ and uses the selected isolation minimum", () => {
    expect(isolationMegaohms(emptyRow({ isolamentoGohm: "5.5" }))).toBe(5500);
    const weak = emptyRow({
      tensaoVoc: "1000",
      polaridade: "Ok",
      flutPositivo: "45",
      flutNegativo: "45",
      isolamentoMohm: "0.5",
    });
    expect(evaluateRow(weak, book, columns)).toBe("fail");
    expect(evaluateRow(weak, { ...book, criterioIsolacao: "nbr16690_large" }, columns)).toBe("pass");
  });

  it("uses temperature and humidity correction for isolation when both are filled", () => {
    const weak = emptyRow({
      tensaoVoc: "1000",
      polaridade: "Ok",
      flutPositivo: "45",
      flutNegativo: "45",
      isolamentoMohm: "0.9",
    });
    expect(evaluateRow(weak, book, columns)).toBe("fail");
    expect(evaluateRow(weak, { ...book, temperatura: "29", umidade: "59" }, columns)).toBe("pass");
  });

  it("stays pending until the header values are filled", () => {
    const row = emptyRow({ tensaoVoc: "1000", polaridade: "Ok" });
    expect(evaluateRow(row, createEmptyWorkbook(), columns)).toBe("pending");
  });
});
