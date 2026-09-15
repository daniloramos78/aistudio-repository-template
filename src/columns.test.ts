import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMNS,
  SMALL_PLANT_COLUMNS,
  applyIsolationCoupling,
  groupSpan,
  normalizeColumns,
  visibleColumns,
} from "./columns";

describe("columns", () => {
  it("defaults to every field visible except TΩ", () => {
    expect(visibleColumns(DEFAULT_COLUMNS)).toHaveLength(12);
    expect(groupSpan(DEFAULT_COLUMNS, "id")).toBe(6);
    expect(groupSpan(DEFAULT_COLUMNS, "float")).toBe(2);
    expect(groupSpan(DEFAULT_COLUMNS, "iso")).toBe(4);
    expect(DEFAULT_COLUMNS.isolamentoTohm).toBe(false);
  });

  it("hides mesa for small plants", () => {
    const cols = visibleColumns(SMALL_PLANT_COLUMNS);
    expect(cols.some((column) => column.id === "mesa")).toBe(false);
    expect(cols.some((column) => column.id === "stringNo")).toBe(true);
  });

  it("falls back to all columns if everything is turned off", () => {
    const restored = normalizeColumns({
      mesa: false,
      stringNo: false,
      pv: false,
      mppt: false,
      tensaoVoc: false,
      polaridade: false,
      flutPositivo: false,
      flutNegativo: false,
      tensaoAplicada: false,
      isolamentoTempo: false,
      isolamentoMohm: false,
      isolamentoGohm: false,
    });
    expect(restored.mesa).toBe(true);
  });

  it("turns off tempo and ohm columns when tensão aplicada is hidden", () => {
    const next = applyIsolationCoupling({
      ...DEFAULT_COLUMNS,
      tensaoAplicada: false,
    });
    expect(next.isolamentoTempo).toBe(false);
    expect(next.isolamentoMohm).toBe(false);
    expect(next.isolamentoGohm).toBe(false);
    expect(next.isolamentoTohm).toBe(false);
  });
});
