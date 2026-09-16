import { describe, expect, it } from "vitest";
import {
  calcularIsolacaoCorrigida,
  fatorCorrecaoTemperatura,
  fatorCorrecaoUmidade,
  formatarIsolacaoCorrigida,
  validarUmidadeRelativa,
} from "./megometro";

describe("megometro correction", () => {
  it("keeps the reading at 20 °C and 50% humidity", () => {
    expect(fatorCorrecaoTemperatura(20)).toBeCloseTo(1);
    expect(fatorCorrecaoUmidade(50)).toBe(1);
    expect(calcularIsolacaoCorrigida(5500, 20, 50)).toBeCloseTo(5500);
  });

  it("raises the 20 °C equivalent when the measurement is hotter", () => {
    const corrected = calcularIsolacaoCorrigida(5500, 29, 59);
    expect(corrected).toBeGreaterThan(5500);
    expect(formatarIsolacaoCorrigida(corrected)).toMatch(/GΩ/);
  });

  it("does not apply humidity discount at or below 50%", () => {
    expect(calcularIsolacaoCorrigida(1000, 20, 40)).toBeCloseTo(1000);
  });

  it("warns when relative humidity is high", () => {
    expect(validarUmidadeRelativa(59).valido).toBe(true);
    expect(validarUmidadeRelativa(75).nivel).toBe("alerta");
    expect(validarUmidadeRelativa(85).nivel).toBe("critico");
    expect(validarUmidadeRelativa(null).nivel).toBe("invalido");
  });
});
