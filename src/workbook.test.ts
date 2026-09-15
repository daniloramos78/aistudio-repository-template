import { describe, expect, it } from "vitest";
import {
  addMesa,
  addString,
  createEmptyWorkbook,
  createExampleWorkbook,
  inverterHasData,
  inverterNameFromNumber,
  inverterNumberFromName,
  isFirstOfMesa,
  mesaColorBand,
  parseWorkbook,
  propagateIsolation,
  serializeWorkbook,
} from "./workbook";

describe("workbook", () => {
  it("creates four inverters and round-trips JSON", () => {
    const book = createEmptyWorkbook();
    expect(book.inverters).toHaveLength(4);
    expect(book.inverters[0].name).toBe("INVERSOR_01");
    const restored = parseWorkbook(serializeWorkbook(book));
    expect(restored.ufv).toBe(book.ufv);
    expect(restored.inverters).toHaveLength(4);
    expect(restored.activeInverterId).toBe(book.activeInverterId);
    expect(restored.columns.mesa).toBe(true);
  });

  it("adds a mesa with two strings and marks the first row", () => {
    const book = createEmptyWorkbook();
    const inverter = addMesa(book.inverters[0], "Mesa 01");
    expect(inverter.rows).toHaveLength(2);
    expect(inverter.rows[0].mesa).toBe("Mesa 01");
    expect(inverter.rows[0].stringNo).toBe("");
    expect(inverter.rows[0].pv).toBe("");
    expect(inverter.rows[0].tensaoAplicada).toBe("");
    expect(inverter.rows[1].stringNo).toBe("");
    expect(isFirstOfMesa(inverter.rows, 0)).toBe(true);
    expect(isFirstOfMesa(inverter.rows, 1)).toBe(false);
    expect(mesaColorBand(inverter.rows, 0)).toBe("a");
    expect(mesaColorBand(inverter.rows, 1)).toBe("a");
    const two = addMesa(inverter, "Mesa 02", 1);
    expect(mesaColorBand(two.rows, 2)).toBe("b");
  });

  it("loads the Manga G. 05 example used in field sheets", () => {
    const example = createExampleWorkbook();
    expect(example.ufv).toBe("Manga G. 05");
    expect(example.inverters[0].rows.length).toBeGreaterThan(10);
    expect(example.inverters[0].rows[0].tensaoVoc).toBe("1002V");
    const restored = parseWorkbook(serializeWorkbook(example));
    expect(restored.inverters[0].rows[0].polaridade).toBe("Ok");
  });

  it("rejects invalid files", () => {
    expect(() => parseWorkbook("[]")).toThrow(/inválido/i);
  });

  it("enables inverter edit only after field data exists", () => {
    const empty = createEmptyWorkbook().inverters[0];
    expect(inverterHasData(empty)).toBe(false);
    expect(inverterHasData(addMesa(empty, "Mesa 01"))).toBe(true);
    expect(inverterHasData(createExampleWorkbook().inverters[2])).toBe(false);
  });

  it("formats inverter numbering", () => {
    expect(inverterNumberFromName("INVERSOR_04")).toBe("04");
    expect(inverterNameFromNumber("7")).toBe("INVERSOR_07");
  });

  it("adds empty strings without auto-filled test values", () => {
    const inverter = addString(createEmptyWorkbook().inverters[0], false);
    expect(inverter.rows).toHaveLength(1);
    expect(inverter.rows[0].stringNo).toBe("");
    expect(inverter.rows[0].pv).toBe("");
    expect(inverter.rows[0].tensaoAplicada).toBe("");
    expect(inverter.rows[0].isolamentoTempo).toBe("");
  });

  it("keeps all columns when opening a file saved before column config existed", () => {
    const raw = JSON.parse(serializeWorkbook(createEmptyWorkbook())) as Record<string, unknown>;
    delete raw.columns;
    const restored = parseWorkbook(JSON.stringify(raw));
    expect(restored.columns.mesa).toBe(true);
    expect(restored.columns.mppt).toBe(true);
    expect(restored.endereco).toBe("");
    expect(restored.criterioIsolacao).toBe("nbr5410");
    expect(restored.columns.isolamentoTohm).toBe(false);
    expect(restored.appearance).toBe("color");
    expect(restored.printAppearance).toBe("color");
  });

  it("copies tensão aplicada and tempo from the previous row", () => {
    const first = addString(createEmptyWorkbook().inverters[0], false);
    first.rows[0].tensaoAplicada = "1kV";
    first.rows[0].isolamentoTempo = "60s";
    const next = addString(first, false);
    expect(next.rows[1].tensaoAplicada).toBe("1kV");
    expect(next.rows[1].isolamentoTempo).toBe("60s");
    expect(next.rows[1].stringNo).toBe("");
  });

  it("copies isolation from the last filled row even if later mesa rows are empty", () => {
    const inverter = addMesa(createEmptyWorkbook().inverters[0], "Mesa 01", 2);
    inverter.rows[0].tensaoAplicada = "1kV";
    inverter.rows[0].isolamentoTempo = "60s";
    const next = addString(inverter, true);
    expect(next.rows[2].tensaoAplicada).toBe("1kV");
    expect(next.rows[2].isolamentoTempo).toBe("60s");
    expect(next.rows[2].mesa).toBe("Mesa 01");
  });

  it("fills following empty rows when tensão aplicada is entered", () => {
    const inverter = addMesa(createEmptyWorkbook().inverters[0], "Mesa 01", 2);
    const rows = propagateIsolation(inverter.rows, inverter.rows[0].id, "tensaoAplicada", "1kV");
    expect(rows[0].tensaoAplicada).toBe("1kV");
    expect(rows[1].tensaoAplicada).toBe("1kV");
    expect(rows[1].isolamentoTempo).toBe("");
  });

  it("restores empty instruments when the saved file predates that section", () => {
    const raw = JSON.parse(serializeWorkbook(createEmptyWorkbook())) as Record<string, unknown>;
    delete raw.multimetro;
    delete raw.megometro;
    const restored = parseWorkbook(JSON.stringify(raw));
    expect(restored.multimetro.fabricanteModelo).toBe("");
    expect(restored.megometro.numeroSerie).toBe("");
    expect(restored.megometro.validadeCalibracao).toBe("");
  });

  it("keeps example instrument identification", () => {
    const example = createExampleWorkbook();
    expect(example.multimetro.fabricanteModelo).toBe("Fluke 87V");
    expect(example.megometro.certificadoCalibracao).toMatch(/RBC/);
    const restored = parseWorkbook(serializeWorkbook(example));
    expect(restored.multimetro.numeroSerie).toBe("36581234");
    expect(restored.megometro.validadeCalibracao).toBe("2027-03-04");
  });
});
