import type { Inverter, Polaridade, TestRow, Workbook } from "./types";
import { FILE_VERSION } from "./types";

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function emptyRow(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: uid("row"),
    mesa: "",
    stringNo: "",
    pv: "",
    mppt: "",
    tensaoVoc: "",
    polaridade: "",
    flutPositivo: "",
    flutNegativo: "",
    tensaoAplicada: "1kV",
    isolamentoTempo: "60s",
    isolamentoMohm: "",
    isolamentoGohm: "",
    ...overrides,
  };
}

export function emptyInverter(index: number): Inverter {
  const n = String(index).padStart(2, "0");
  return {
    id: uid("inv"),
    name: `INVERSOR_${n}`,
    rows: [],
  };
}

export function createEmptyWorkbook(): Workbook {
  const inverters = [1, 2, 3, 4].map((n) => emptyInverter(n));
  return {
    version: FILE_VERSION,
    ufv: "",
    data: todayISO(),
    umidade: "",
    temperatura: "",
    tecnico: "",
    observacoes: "",
    inverters,
    activeInverterId: inverters[0].id,
  };
}

export function addMesa(inverter: Inverter, mesaLabel: string, strings = 2): Inverter {
  const label = mesaLabel.trim() || nextMesaLabel(inverter);
  const startPv = nextNumber(inverter.rows.map((r) => r.pv));
  const startMppt = nextNumber(inverter.rows.map((r) => r.mppt));
  const rows = [...inverter.rows];
  for (let i = 0; i < strings; i += 1) {
    rows.push(
      emptyRow({
        mesa: label,
        stringNo: String(i + 1),
        pv: String(startPv + i),
        mppt: String(startMppt),
      }),
    );
  }
  return { ...inverter, rows };
}

export function addString(inverter: Inverter): Inverter {
  const last = inverter.rows[inverter.rows.length - 1];
  const mesa = last?.mesa ?? nextMesaLabel(inverter);
  const stringNo = last ? String(Number(last.stringNo || "0") + 1) : "1";
  return {
    ...inverter,
    rows: [
      ...inverter.rows,
      emptyRow({
        mesa,
        stringNo,
        pv: String(nextNumber(inverter.rows.map((r) => r.pv))),
        mppt: last?.mppt ?? "",
      }),
    ],
  };
}

export function removeRow(inverter: Inverter, rowId: string): Inverter {
  return { ...inverter, rows: inverter.rows.filter((row) => row.id !== rowId) };
}

export function updateRow(
  inverter: Inverter,
  rowId: string,
  patch: Partial<TestRow>,
): Inverter {
  return {
    ...inverter,
    rows: inverter.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
  };
}

export function mesaGroups(rows: TestRow[]): Array<{ mesa: string; start: number; count: number }> {
  const groups: Array<{ mesa: string; start: number; count: number }> = [];
  rows.forEach((row, index) => {
    const key = row.mesa.trim() || `row-${index}`;
    const prev = groups[groups.length - 1];
    if (prev && prev.mesa === key) {
      prev.count += 1;
    } else {
      groups.push({ mesa: key, start: index, count: 1 });
    }
  });
  return groups;
}

export function isFirstOfMesa(rows: TestRow[], index: number): boolean {
  if (index === 0) return true;
  const current = rows[index].mesa.trim();
  const previous = rows[index - 1].mesa.trim();
  if (!current) return true;
  return current !== previous;
}

export function serializeWorkbook(workbook: Workbook): string {
  return `${JSON.stringify(workbook, null, 2)}\n`;
}

export function parseWorkbook(raw: string): Workbook {
  const data = JSON.parse(raw) as Partial<Workbook>;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Arquivo inválido.");
  }
  const fallback = createEmptyWorkbook();
  const inverters = Array.isArray(data.inverters) && data.inverters.length > 0
    ? data.inverters.map((inv, index) => normalizeInverter(inv, index))
    : fallback.inverters;
  const active =
    inverters.find((inv) => inv.id === data.activeInverterId)?.id ?? inverters[0].id;
  return {
    version: FILE_VERSION,
    ufv: String(data.ufv ?? ""),
    data: String(data.data ?? todayISO()),
    umidade: String(data.umidade ?? ""),
    temperatura: String(data.temperatura ?? ""),
    tecnico: String(data.tecnico ?? ""),
    observacoes: String(data.observacoes ?? ""),
    inverters,
    activeInverterId: active,
  };
}

export function fileTitle(workbook: Workbook): string {
  const ufv = workbook.ufv.trim().replaceAll(/[\\/:*?"<>|]+/g, "-") || "teste";
  const date = workbook.data || todayISO();
  return `${ufv}-${date}`;
}

export function suggestedFileName(workbook: Workbook): string {
  return `${fileTitle(workbook)}.ufv.json`;
}

export function suggestedPdfName(workbook: Workbook): string {
  return `${fileTitle(workbook)}.pdf`;
}

export function countMesas(inverter: Inverter): number {
  return new Set(inverter.rows.map((row) => row.mesa.trim()).filter(Boolean)).size;
}

export function inverterHasData(inverter: Inverter): boolean {
  return inverter.rows.some((row) => {
    if (
      row.mesa.trim() ||
      row.stringNo.trim() ||
      row.pv.trim() ||
      row.mppt.trim() ||
      row.tensaoVoc.trim() ||
      row.polaridade ||
      row.flutPositivo.trim() ||
      row.flutNegativo.trim() ||
      row.isolamentoMohm.trim() ||
      row.isolamentoGohm.trim()
    ) {
      return true;
    }
    if (row.tensaoAplicada.trim() && row.tensaoAplicada.trim() !== "1kV") return true;
    if (row.isolamentoTempo.trim() && row.isolamentoTempo.trim() !== "60s") return true;
    return false;
  });
}

export function inverterNumberFromName(name: string): string {
  const match = name.match(/(\d+)\s*$/);
  if (!match) return "";
  return String(Number(match[1])).padStart(2, "0");
}

export function inverterNameFromNumber(raw: string): string {
  const n = Number(String(raw).replaceAll(/\D+/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "INVERSOR_01";
  return `INVERSOR_${String(Math.trunc(n)).padStart(2, "0")}`;
}

export function createExampleWorkbook(): Workbook {
  const book = createEmptyWorkbook();
  const inv1 = {
    ...book.inverters[0],
    rows: exampleInversor01(),
  };
  const inv2 = {
    ...book.inverters[1],
    rows: exampleInversor02(),
  };
  const inv4 = {
    ...book.inverters[3],
    rows: exampleInversor04(),
  };
  return {
    ...book,
    ufv: "Manga G. 05",
    data: "2026-08-25",
    umidade: "40.00",
    temperatura: "33",
    inverters: [inv1, inv2, book.inverters[2], inv4],
    activeInverterId: inv1.id,
  };
}

function normalizeInverter(input: Partial<Inverter>, index: number): Inverter {
  const base = emptyInverter(index + 1);
  return {
    id: String(input.id || base.id),
    name: String(input.name || base.name),
    rows: Array.isArray(input.rows) ? input.rows.map(normalizeRow) : [],
  };
}

function normalizeRow(input: Partial<TestRow>): TestRow {
  const polaridade = input.polaridade === "Ok" || input.polaridade === "Nok"
    ? input.polaridade
    : "";
  return emptyRow({
    id: String(input.id || uid("row")),
    mesa: String(input.mesa ?? ""),
    stringNo: String(input.stringNo ?? ""),
    pv: String(input.pv ?? ""),
    mppt: String(input.mppt ?? ""),
    tensaoVoc: String(input.tensaoVoc ?? ""),
    polaridade: polaridade as Polaridade,
    flutPositivo: String(input.flutPositivo ?? ""),
    flutNegativo: String(input.flutNegativo ?? ""),
    tensaoAplicada: String(input.tensaoAplicada ?? "1kV"),
    isolamentoTempo: String(input.isolamentoTempo ?? "60s"),
    isolamentoMohm: String(input.isolamentoMohm ?? ""),
    isolamentoGohm: String(input.isolamentoGohm ?? ""),
  });
}

function nextMesaLabel(inverter: Inverter): string {
  const numbers = inverter.rows
    .map((row) => Number((row.mesa.match(/\d+/) || [])[0]))
    .filter((n) => Number.isFinite(n) && n > 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `Mesa ${String(next).padStart(2, "0")}`;
}

function nextNumber(values: string[]): number {
  const numbers = values.map((value) => Number(value)).filter((n) => Number.isFinite(n) && n > 0);
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function row(
  mesa: string,
  stringNo: string,
  pv: string,
  mppt: string,
  voc: string,
  polaridade: Polaridade,
  pos: string,
  neg: string,
  aplicada = "1kV",
  tempo = "60s",
  gohm = "5.5",
): TestRow {
  return emptyRow({
    mesa,
    stringNo,
    pv,
    mppt,
    tensaoVoc: voc,
    polaridade,
    flutPositivo: pos,
    flutNegativo: neg,
    tensaoAplicada: aplicada,
    isolamentoTempo: tempo,
    isolamentoGohm: gohm,
  });
}

function exampleInversor01(): TestRow[] {
  return [
    row("Mesa 25", "1", "1", "1", "1002V", "Ok", "21V", "23V"),
    row("Mesa 25", "2", "15", "4", "1002V", "Ok", "21V", "23V"),
    row("Mesa 26", "1", "16", "4", "1002V", "Ok", "22V", "23V"),
    row("Mesa 26", "2", "17", "4", "1003V", "Ok", "25V", "25V"),
    row("Mesa 27", "1", "18", "4", "996V", "Ok", "24V", "26V"),
    row("Mesa 27", "2", "19", "5", "999V", "Ok", "23V", "24V"),
    row("Mesa 28", "1", "20", "5", "1000V", "Ok", "23V", "25V"),
    row("Mesa 28", "2", "21", "5", "997V", "Ok", "24V", "26V"),
    row("Mesa 29", "1", "22", "5", "998V", "Ok", "25V", "24V"),
    row("Mesa 29", "2", "24", "6", "1000V", "Ok", "23V", "24V"),
    row("Mesa 30", "1", "25", "6", "1000V", "Ok", "25V", "25V"),
    row("Mesa 30", "2", "26", "6", "996V", "Ok", "25V", "25V"),
    row("Mesa 36", "1", "2", "1", "1000V", "Ok", "26V", "26V"),
    row("Mesa 36", "2", "3", "1", "997V", "Ok", "23V", "25V"),
    row("Mesa 37", "1", "4", "1", "1001V", "Ok", "25V", "26V"),
    row("Mesa 37", "2", "5", "1", "1002V", "Ok", "25V", "26V"),
    row("Mesa 38", "1", "6", "2", "996V", "Ok", "24V", "25V"),
    row("Mesa 38", "2", "7", "2", "996V", "Ok", "25V", "26V"),
    row("Mesa 39", "1", "8", "2", "999V", "Ok", "25V", "26V"),
    row("Mesa 39", "2", "10", "2", "999V", "Ok", "23V", "25V"),
    row("Mesa 40", "1", "11", "3", "998V", "Ok", "23V", "25V"),
    row("Mesa 40", "2", "13", "3", "1001V", "Ok", "21V", "24V"),
  ];
}

function exampleInversor02(): TestRow[] {
  const mesas = [
    ["Mesa 01", "1", "1", "1", "1009"],
    ["Mesa 01", "2", "2", "1", "1007"],
    ["Mesa 02", "1", "3", "1", "1008"],
    ["Mesa 02", "2", "4", "1", "1004"],
    ["Mesa 03", "1", "5", "2", "1005"],
    ["Mesa 03", "2", "6", "2", "1003"],
    ["Mesa 04", "1", "7", "2", "1016"],
    ["Mesa 04", "2", "8", "2", "1012"],
    ["Mesa 05", "1", "10", "3", "1010"],
    ["Mesa 05", "2", "11", "3", "1005"],
    ["Mesa 06", "1", "12", "3", "1008"],
    ["Mesa 06", "2", "16", "4", "1016"],
    ["Mesa 13", "1", "16", "4", "1005"],
    ["Mesa 13", "2", "17", "4", "1000"],
    ["Mesa 14", "1", "18", "4", "1002"],
    ["Mesa 14", "2", "19", "5", "1004"],
    ["Mesa 15", "1", "20", "5", "1003"],
    ["Mesa 15", "2", "21", "5", "1003"],
    ["Mesa 16", "1", "22", "5", "1004"],
    ["Mesa 16", "2", "25", "6", "1004"],
    ["Mesa 17", "1", "25", "6", "1004"],
    ["Mesa 17", "2", "26", "6", "1007"],
    ["Mesa 18", "2", "", "", ""],
  ];
  return mesas.map(([mesa, stringNo, pv, mppt, voc]) =>
    row(mesa, stringNo, pv, mppt, voc, voc ? "Ok" : "", "", "", voc ? "1kV" : "1kV", voc ? "60s" : "", voc ? "5.5" : ""),
  );
}

function exampleInversor04(): TestRow[] {
  return [
    row("Mesa 31", "1", "1", "1", "980V", "Ok", "28V", "31V"),
    row("Mesa 31", "2", "2", "1", "990V", "Ok", "31V", "32V"),
    row("Mesa 32", "1", "3", "1", "979V", "Ok", "32V", "33V"),
    row("Mesa 32", "2", "4", "1", "980V", "Ok", "33V", "32V"),
    row("Mesa 33", "1", "5", "2", "977V", "Ok", "32V", "32V"),
    row("Mesa 33", "2", "6", "2", "978V", "Ok", "30V", "31V"),
    row("Mesa 34", "1", "7", "2", "978V", "Ok", "31V", "33V"),
    row("Mesa 34", "2", "8", "2", "981V", "Ok", "30V", "31V"),
    row("Mesa 35", "1", "10", "3", "983V", "Ok", "33V", "33V"),
    row("Mesa 35", "2", "11", "3", "983V", "Ok", "31V", "33V"),
    row("Mesa 36", "1", "12", "3", "984V", "Ok", "34V", "34V"),
    row("Mesa 36", "2", "15", "4", "983V", "Ok", "33V", "34V"),
    row("Mesa 42", "1", "16", "4", "987V", "Ok", "34V", "35V"),
    row("Mesa 42", "2", "17", "4", "985V", "Ok", "34V", "35V"),
    row("Mesa 43", "1", "18", "4", "977V", "Ok", "33V", "33V"),
    row("Mesa 43", "2", "19", "5", "964V", "Ok", "32V", "33V"),
    row("Mesa 44", "1", "20", "5", "983V", "Ok", "32V", "34V"),
    row("Mesa 44", "2", "21", "5", "979V", "Ok", "32V", "33V"),
    row("Mesa 45", "1", "22", "5", "983V", "Ok", "33V", "33V"),
    row("Mesa 45", "2", "24", "6", "984V", "Ok", "33V", "33V"),
    row("Mesa 46", "1", "25", "6", "983V", "Ok", "32V", "33V"),
  ];
}
