import type { ColumnConfig, ColumnId, TestRow } from "./types";
import { LAYOUTS_KEY } from "./types";

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
  { id: "tensaoAplicada", label: "Tensão Aplicada", group: "iso" },
  { id: "isolamentoTempo", label: "Tempo", group: "iso" },
  { id: "isolamentoMohm", label: "MΩ", group: "iso" },
  { id: "isolamentoGohm", label: "GΩ", group: "iso" },
  { id: "isolamentoTohm", label: "TΩ", group: "iso" },
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
  isolamentoTohm: false,
};

export const SMALL_PLANT_COLUMNS: ColumnConfig = {
  mesa: false,
  stringNo: true,
  pv: false,
  mppt: true,
  tensaoVoc: true,
  polaridade: true,
  flutPositivo: true,
  flutNegativo: true,
  tensaoAplicada: false,
  isolamentoTempo: false,
  isolamentoMohm: false,
  isolamentoGohm: false,
  isolamentoTohm: false,
};

export const LARGE_PLANT_COLUMNS: ColumnConfig = { ...DEFAULT_COLUMNS };

export type LayoutKind = "small" | "large";

export type SavedLayouts = {
  small?: ColumnConfig;
  large?: ColumnConfig;
};

export function factoryLayout(kind: LayoutKind): ColumnConfig {
  return kind === "small" ? { ...SMALL_PLANT_COLUMNS } : { ...LARGE_PLANT_COLUMNS };
}

export function loadLayouts(): SavedLayouts {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAYOUTS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as SavedLayouts;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function layoutFor(kind: LayoutKind): ColumnConfig {
  const saved = loadLayouts()[kind];
  return saved ? normalizeColumns(saved) : factoryLayout(kind);
}

export function saveLayout(kind: LayoutKind, columns: ColumnConfig): void {
  if (typeof window === "undefined") return;
  const current = loadLayouts();
  current[kind] = normalizeColumns(columns);
  window.localStorage.setItem(LAYOUTS_KEY, JSON.stringify(current));
}

export function needsMegohmmeter(config: ColumnConfig): boolean {
  return Boolean(
    config.tensaoAplicada
    || config.isolamentoTempo
    || config.isolamentoMohm
    || config.isolamentoGohm
    || config.isolamentoTohm,
  );
}

export function needsMultimeter(config: ColumnConfig): boolean {
  return Boolean(
    config.tensaoVoc
    || config.polaridade
    || config.flutPositivo
    || config.flutNegativo,
  );
}

export function applyIsolationCoupling(config: ColumnConfig): ColumnConfig {
  if (config.tensaoAplicada) return config;
  return {
    ...config,
    isolamentoTempo: false,
    isolamentoMohm: false,
    isolamentoGohm: false,
    isolamentoTohm: false,
  };
}

export function normalizeColumns(input?: Partial<ColumnConfig> | null): ColumnConfig {
  const next = applyIsolationCoupling({ ...DEFAULT_COLUMNS, ...input });
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
