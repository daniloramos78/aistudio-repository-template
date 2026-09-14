import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMNS,
  SMALL_PLANT_COLUMNS,
  groupSpan,
  normalizeColumns,
  visibleColumns,
} from "./columns";

describe("columns", () => {
  it("defaults to every field visible", () => {
    expect(visibleColumns(DEFAULT_COLUMNS)).toHaveLength(12);
    expect(groupSpan(DEFAULT_COLUMNS, "id")).toBe(6);
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
});
