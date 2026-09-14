import { describe, expect, it } from "vitest";
import {
  addMesa,
  createEmptyWorkbook,
  createExampleWorkbook,
  isFirstOfMesa,
  parseWorkbook,
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
  });

  it("adds a mesa with two strings and marks the first row", () => {
    const book = createEmptyWorkbook();
    const inverter = addMesa(book.inverters[0], "Mesa 01");
    expect(inverter.rows).toHaveLength(2);
    expect(inverter.rows[0].mesa).toBe("Mesa 01");
    expect(inverter.rows[0].stringNo).toBe("1");
    expect(inverter.rows[1].stringNo).toBe("2");
    expect(isFirstOfMesa(inverter.rows, 0)).toBe(true);
    expect(isFirstOfMesa(inverter.rows, 1)).toBe(false);
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
});
