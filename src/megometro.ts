/** Temperatura de referência da isolação (NBR / prática de campo). */
export const ISOLATION_REF_TEMP_C = 20;

/**
 * Coeficiente térmico típico de isolação polimérica (°C).
 * R20 = Rt × 10^((T − 20) / α)
 */
export const ISOLATION_TEMP_ALPHA = 40;

export type HumidityCheck = {
  valido: boolean;
  nivel: "ok" | "alerta" | "critico" | "invalido";
  mensagem: string;
};

export function fatorCorrecaoTemperatura(temperaturaC: number): number {
  if (!Number.isFinite(temperaturaC)) return 1;
  return 10 ** ((temperaturaC - ISOLATION_REF_TEMP_C) / ISOLATION_TEMP_ALPHA);
}

export function fatorCorrecaoUmidade(umidadePct: number): number {
  if (!Number.isFinite(umidadePct) || umidadePct <= 50) return 1;
  return 1 + Math.min(0.4, (umidadePct - 50) * 0.01);
}

export function calcularIsolacaoCorrigida(
  valorMohm: number,
  temperaturaC: number,
  umidadePct?: number,
): number {
  if (!Number.isFinite(valorMohm)) return valorMohm;
  const kt = fatorCorrecaoTemperatura(temperaturaC);
  const kh = umidadePct == null ? 1 : fatorCorrecaoUmidade(umidadePct);
  return valorMohm * kt / kh;
}

export function validarUmidadeRelativa(umidade: number | null): HumidityCheck {
  if (umidade == null || !Number.isFinite(umidade)) {
    return {
      valido: false,
      nivel: "invalido",
      mensagem: "Informe a umidade relativa para o ensaio de isolação.",
    };
  }
  if (umidade < 0 || umidade > 100) {
    return {
      valido: false,
      nivel: "invalido",
      mensagem: "Umidade relativa deve ficar entre 0 e 100%.",
    };
  }
  if (umidade > 80) {
    return {
      valido: false,
      nivel: "critico",
      mensagem: "Umidade acima de 80%. O ensaio de isolação não é representativo (NBR 5410).",
    };
  }
  if (umidade > 70) {
    return {
      valido: false,
      nivel: "alerta",
      mensagem: "Umidade acima de 70%. A leitura de isolação pode ficar abaixo do valor real.",
    };
  }
  return { valido: true, nivel: "ok", mensagem: "" };
}

export function formatarIsolacaoCorrigida(mohm: number): string {
  if (!Number.isFinite(mohm)) return "";
  if (mohm >= 1_000_000) return `${formatOhm(mohm / 1_000_000)} TΩ`;
  if (mohm >= 1000) return `${formatOhm(mohm / 1000)} GΩ`;
  return `${formatOhm(mohm)} MΩ`;
}

function formatOhm(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(".", ",");
}
