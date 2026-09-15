import type { ColumnConfig, IsolationCriterion, TestRow, Workbook } from "./types";

export type Verdict = "pass" | "fail" | "pending";

export const ISOLATION_MIN_MOHM: Record<IsolationCriterion, number> = {
  nbr5410: 1,
  nbr16690_small: 0.05,
  nbr16690_medium: 0.02,
  nbr16690_large: 0.01,
  selv_pelv: 0.25,
};

export const ISOLATION_OPTIONS: Array<{ id: IsolationCriterion; label: string }> = [
  { id: "nbr5410", label: "NBR 5410 / mercado — ≥ 1,0 MΩ" },
  { id: "nbr16690_small", label: "NBR 16690 — arranjo < 20 kW (≥ 0,05 MΩ)" },
  { id: "nbr16690_medium", label: "NBR 16690 — 20 a 100 kW (≥ 0,02 MΩ)" },
  { id: "nbr16690_large", label: "NBR 16690 — arranjo > 100 kW (≥ 0,01 MΩ)" },
  { id: "selv_pelv", label: "SELV/PELV 250 Vcc — ≥ 0,25 MΩ" },
];

export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const kilo = /kV$/i.test(trimmed);
  const normalized = trimmed.replace(",", ".");
  const numeric = Number(normalized.replace(/[^\d.eE+-]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return kilo ? numeric * 1000 : numeric;
}

export function parseCriterion(raw: unknown): IsolationCriterion {
  if (typeof raw === "string" && raw in ISOLATION_MIN_MOHM) {
    return raw as IsolationCriterion;
  }
  return "nbr5410";
}

export function isolationMegaohms(row: TestRow): number | null {
  const mega = parseNumber(row.isolamentoMohm);
  const giga = parseNumber(row.isolamentoGohm);
  const tera = parseNumber(row.isolamentoTohm);
  if (mega == null && giga == null && tera == null) return null;
  return (mega ?? 0) + (giga ?? 0) * 1000 + (tera ?? 0) * 1_000_000;
}

function combine(parts: Verdict[]): Verdict {
  if (parts.length === 0) return "pending";
  if (parts.some((part) => part === "fail")) return "fail";
  if (parts.some((part) => part === "pending")) return "pending";
  return "pass";
}

function vocVerdict(row: TestRow, book: Workbook, columns: ColumnConfig): Verdict | null {
  if (!columns.tensaoVoc) return null;
  const measured = parseNumber(row.tensaoVoc);
  const expected = parseNumber(book.vocEsperada);
  const percent = parseNumber(book.erroPercentual);
  if (measured == null || expected == null || percent == null || expected === 0) return "pending";
  const delta = Math.abs(measured - expected) / expected;
  return delta <= percent / 100 ? "pass" : "fail";
}

function polarityVerdict(row: TestRow, columns: ColumnConfig): Verdict | null {
  if (!columns.polaridade) return null;
  if (row.polaridade === "Ok") return "pass";
  if (row.polaridade === "Nok") return "fail";
  return "pending";
}

function poleVerdict(raw: string, moduleVolt: number): Verdict {
  const value = parseNumber(raw);
  if (value == null) return "pending";
  if (value <= 0 || value > moduleVolt) return "fail";
  return "pass";
}

function floatingVerdict(row: TestRow, book: Workbook, columns: ColumnConfig): Verdict | null {
  if (!columns.flutPositivo && !columns.flutNegativo) return null;
  const moduleVolt = parseNumber(book.tensaoModulo);
  if (moduleVolt == null || moduleVolt <= 0) return "pending";
  const parts: Verdict[] = [];
  if (columns.flutPositivo) parts.push(poleVerdict(row.flutPositivo, moduleVolt));
  if (columns.flutNegativo) parts.push(poleVerdict(row.flutNegativo, moduleVolt));
  return combine(parts);
}

function isolationVerdict(row: TestRow, book: Workbook, columns: ColumnConfig): Verdict | null {
  const ohmVisible = columns.isolamentoMohm || columns.isolamentoGohm || columns.isolamentoTohm;
  if (!columns.tensaoAplicada && !ohmVisible) return null;
  if (!ohmVisible) return "pending";
  const mega = isolationMegaohms(row);
  if (mega == null) return "pending";
  const min = ISOLATION_MIN_MOHM[book.criterioIsolacao] ?? ISOLATION_MIN_MOHM.nbr5410;
  return mega >= min ? "pass" : "fail";
}

export function evaluateRow(row: TestRow, book: Workbook, columns: ColumnConfig): Verdict {
  return combine(
    [
      vocVerdict(row, book, columns),
      polarityVerdict(row, columns),
      floatingVerdict(row, book, columns),
      isolationVerdict(row, book, columns),
    ].filter((part): part is Verdict => part != null),
  );
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === "pass") return "Aprovado";
  if (verdict === "fail") return "Reprovado";
  return "Pendente";
}
