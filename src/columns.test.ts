import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMNS,
  LARGE_PLANT_COLUMNS,
  SMALL_PLANT_COLUMNS,
  applyIsolationCoupling,
  displayColumns,
  factoryLayout,
  groupSpan,
  layoutFor,
  needsMegohmmeter,
  needsMultimeter,
  normalizeColumns,
  visibleColumns,
} from "./columns";

describe("columns", () => {
  it("defaults to every field visible except TΩ", () => {
    expect(visibleColumns(DEFAULT_COLUMNS)).toHaveLength(13);
    expect(groupSpan(DEFAULT_COLUMNS, "id")).toBe(7);
    expect(groupSpan(DEFAULT_COLUMNS, "float")).toBe(2);
    expect(groupSpan(DEFAULT_COLUMNS, "iso")).toBe(4);
    expect(DEFAULT_COLUMNS.isolamentoTohm).toBe(false);
  });

  it("hides mesa for small plants and keeps string, mppt, voc, polarity and floating", () => {
    const cols = visibleColumns(SMALL_PLANT_COLUMNS);
    expect(cols.map((column) => column.id)).toEqual([
      "stringNo",
      "mppt",
      "tensaoVoc",
      "polaridade",
      "flutPositivo",
      "flutNegativo",
    ]);
    expect(needsMegohmmeter(SMALL_PLANT_COLUMNS)).toBe(false);
    expect(needsMultimeter(SMALL_PLANT_COLUMNS)).toBe(true);
    expect(needsMegohmmeter(DEFAULT_COLUMNS)).toBe(true);
    expect(needsMultimeter(DEFAULT_COLUMNS)).toBe(true);
    expect(factoryLayout("small")).toEqual(SMALL_PLANT_COLUMNS);
    expect(factoryLayout("large")).toEqual(LARGE_PLANT_COLUMNS);
    expect(layoutFor("small")).toEqual(SMALL_PLANT_COLUMNS);
  });

  it("adds the 20 °C corrected isolation column only when isolation is on", () => {
    expect(displayColumns(DEFAULT_COLUMNS).map((column) => column.id)).toContain("isolamentoCorrigido");
    expect(displayColumns(SMALL_PLANT_COLUMNS).map((column) => column.id)).not.toContain("isolamentoCorrigido");
    expect(displayColumns(DEFAULT_COLUMNS).some((column) => column.id === "secaoCondutor")).toBe(true);
  });

  it("ties the megohmmeter to isolation and the multimeter to voc, polarity and floating", () => {
    expect(needsMegohmmeter({ ...DEFAULT_COLUMNS, tensaoAplicada: false, isolamentoTempo: false, isolamentoMohm: false, isolamentoGohm: false, isolamentoTohm: false })).toBe(false);
    expect(needsMultimeter({
      ...DEFAULT_COLUMNS,
      tensaoVoc: false,
      polaridade: false,
      flutPositivo: false,
      flutNegativo: false,
    })).toBe(false);
  });

  it("falls back to all columns if everything is turned off", () => {
    const restored = normalizeColumns({
      mesa: false,
      stringNo: false,
      pv: false,
      mppt: false,
      secaoCondutor: false,
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
