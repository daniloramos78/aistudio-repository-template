import type { ColumnConfig, ColumnId, TestRow } from "./types";

export type { ColumnConfig, ColumnId };

export type ColumnGroup = "id" | "float" | "iso";

export interface ColumnDef {
  id: ColumnId;
  label: string;
  group: ColumnGroup;
}

export const COLUMNS: ColumnDef[] = [
  { id: "mesa", label: "Mesa", group: "id" },
  { id: "stringNo", label: "String", group: "id" },
  { id: "pv", label: "PV", group: "id" },
  { id: "mppt", label: "MPPT", group: "id" },
  { id: "tensaoVoc", label: "Tensão Voc", group: "id" },
  { id: "polaridade", label: "Polaridade", group: "id" },
  { id: "flutPositivo", label: "Positivo + T", group: "float" },
  { id: "flutNegativo", label: "Negativo + T", group: "float" },
  { id: "tensaoAplicada", label: "Tensão Aplicada", group: "float" },
  { id: "isolamentoTempo", label: "Tempo", group: "iso" },
  { id: "isolamentoMohm", label: "MΩ", group: "iso" },
  { id: "isolamentoGohm", label: "GΩ", group: "iso" },
];

export const GROUP_LABEL: Record<ColumnGroup, string> = {
  id: "Identificação",
  float: "Teste de Flutuação",
  iso: "Teste de Isolação",
};

export const DEFAULT_COLUMNS: ColumnConfig = {
  mesa: true,
  stringNo: true,
  pv: true,
  mppt: true,
  tensaoVoc: true,
  polaridade: true,
  flutPositivo: true,
  flutNegativo: true,
  tensaoAplicada: true,
  isolamentoTempo: true,
  isolamentoMohm: true,
  isolamentoGohm: true,
};

export const SMALL_PLANT_COLUMNS: ColumnConfig = {
  ...DEFAULT_COLUMNS,
  mesa: false,
};

export function normalizeColumns(input?: Partial<ColumnConfig> | null): ColumnConfig {
  const next = { ...DEFAULT_COLUMNS, ...input };
  if (!COLUMNS.some((column) => next[column.id])) {
    return { ...DEFAULT_COLUMNS };
  }
  return next;
}

export function visibleColumns(config: ColumnConfig): ColumnDef[] {
  return COLUMNS.filter((column) => config[column.id]);
}

export function groupSpan(config: ColumnConfig, group: ColumnGroup): number {
  return COLUMNS.filter((column) => column.group === group && config[column.id]).length;
}

export function rowValue(row: TestRow, id: ColumnId): string {
  return String(row[id] ?? "");
}
