export type Polaridade = "" | "Ok" | "Nok";

export type IsolationCriterion =
  | "nbr5410"
  | "nbr16690_small"
  | "nbr16690_medium"
  | "nbr16690_large"
  | "selv_pelv";

export type ColumnId =
  | "mesa"
  | "stringNo"
  | "pv"
  | "mppt"
  | "tensaoVoc"
  | "polaridade"
  | "flutPositivo"
  | "flutNegativo"
  | "tensaoAplicada"
  | "isolamentoTempo"
  | "isolamentoMohm"
  | "isolamentoGohm"
  | "isolamentoTohm";

export type ColumnConfig = Record<ColumnId, boolean>;

export interface TestRow {
  id: string;
  mesa: string;
  stringNo: string;
  pv: string;
  mppt: string;
  tensaoVoc: string;
  polaridade: Polaridade;
  flutPositivo: string;
  flutNegativo: string;
  tensaoAplicada: string;
  isolamentoTempo: string;
  isolamentoMohm: string;
  isolamentoGohm: string;
  isolamentoTohm: string;
}

export interface Inverter {
  id: string;
  name: string;
  rows: TestRow[];
}

export interface Workbook {
  version: 1;
  ufv: string;
  data: string;
  umidade: string;
  temperatura: string;
  tecnico: string;
  observacoes: string;
  endereco: string;
  vocEsperada: string;
  erroPercentual: string;
  tensaoModulo: string;
  criterioIsolacao: IsolationCriterion;
  columns: ColumnConfig;
  inverters: Inverter[];
  activeInverterId: string;
}

export const FILE_VERSION = 1 as const;
export const DRAFT_KEY = "planilha-testes-ufv.draft";
export const RECENT_KEY = "planilha-testes-ufv.recent";
