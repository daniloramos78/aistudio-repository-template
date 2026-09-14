export type Polaridade = "" | "Ok" | "Nok";

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
  inverters: Inverter[];
  activeInverterId: string;
}

export const FILE_VERSION = 1 as const;
export const DRAFT_KEY = "planilha-testes-ufv.draft";
export const RECENT_KEY = "planilha-testes-ufv.recent";
