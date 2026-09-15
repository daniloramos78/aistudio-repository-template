import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  GROUP_LABEL,
  groupSpan,
  normalizeColumns,
  rowValue,
  visibleColumns,
  type ColumnConfig,
  type ColumnGroup,
} from "./columns";
import type { Workbook } from "./types";
import { evaluateRow, verdictLabel } from "./verdict";
import { instrumentHasData, instrumentLine } from "./workbook";
import dejaVuBold from "./fonts/DejaVuSansOhm-Bold.ttf?inline";
import dejaVuRegular from "./fonts/DejaVuSansOhm.ttf?inline";

const FONT = "DejaVu";

function ttfBase64(dataUrl: string): string {
  const marker = "base64,";
  const index = dataUrl.indexOf(marker);
  return index >= 0 ? dataUrl.slice(index + marker.length) : dataUrl;
}

function registerOhmFont(doc: jsPDF) {
  doc.addFileToVFS("DejaVuSansOhm.ttf", ttfBase64(dejaVuRegular));
  doc.addFileToVFS("DejaVuSansOhm-Bold.ttf", ttfBase64(dejaVuBold));
  doc.addFont("DejaVuSansOhm.ttf", FONT, "normal");
  doc.addFont("DejaVuSansOhm-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return iso;
}

export function pdfHeaderNotes(workbook: Workbook): string[] {
  const extra = [
    workbook.endereco ? `Endereço: ${workbook.endereco}` : "",
    workbook.vocEsperada ? `Voc esp.: ${workbook.vocEsperada}` : "",
    workbook.erroPercentual ? `Erro ±: ${workbook.erroPercentual}%` : "",
    workbook.tensaoModulo ? `Módulo: ${workbook.tensaoModulo}` : "",
  ].filter(Boolean);
  const who = [
    workbook.tecnico ? `Técnico: ${workbook.tecnico}` : "",
    workbook.observacoes ? `Observações: ${workbook.observacoes}` : "",
  ].filter(Boolean);
  const instruments = [
    instrumentHasData(workbook.multimetro)
      ? instrumentLine("Multímetro/alicate", workbook.multimetro)
      : "",
    instrumentHasData(workbook.megometro)
      ? instrumentLine("Megômetro", workbook.megometro)
      : "",
  ].filter(Boolean);
  return [...extra, who.join("  ·  "), ...instruments].filter(Boolean);
}

export function buildPdf(workbook: Workbook): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  registerOhmFont(doc);
  const columns = normalizeColumns(workbook.columns);
  const vis = visibleColumns(columns);
  const margin = 10;

  workbook.inverters.forEach((inverter, index) => {
    if (index > 0) doc.addPage();

    doc.setFont(FONT, "bold");
    doc.setFontSize(14);
    doc.text("Planilha de Testes UFV", margin, 12);

    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    doc.text(`UFV: ${workbook.ufv || "—"}`, margin, 18);
    doc.text(`Data: ${fmtDate(workbook.data) || "—"}`, 80, 18);
    doc.text(`Umidade: ${workbook.umidade ? `${workbook.umidade}%` : "—"}`, 130, 18);
    doc.text(`Temperatura: ${workbook.temperatura ? `${workbook.temperatura}°C` : "—"}`, 185, 18);
    doc.text(inverter.name, 250, 18, { align: "right" });

    doc.setFontSize(8);
    let y = 23;
    for (const line of pdfHeaderNotes(workbook)) {
      doc.text(line, margin, y);
      y += 4.5;
    }

    const headOffset = y + 2;

    autoTable(doc, {
      startY: headOffset,
      theme: "grid",
      styles: {
        font: FONT,
        fontStyle: "normal",
        fontSize: 7.5,
        cellPadding: 1.2,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        font: FONT,
        fontStyle: "bold",
        textColor: 20,
      },
      head: pdfHead(columns),
      body: inverter.rows.map((row, rowIndex) => {
        const first =
          rowIndex === 0 || row.mesa.trim() !== inverter.rows[rowIndex - 1].mesa.trim();
        const cells: Array<string | { content: string; styles: Record<string, unknown> }> = vis.map((column) => {
          if (column.id === "mesa") {
            return {
              content: row.mesa,
              styles: first
                ? { fillColor: [255, 241, 118], fontStyle: "bold", textColor: 20 }
                : { textColor: 90 },
            };
          }
          return rowValue(row, column.id);
        });
        const verdict = evaluateRow(row, workbook, columns);
        cells.push({
          content: verdictLabel(verdict),
          styles:
            verdict === "pass"
              ? { fillColor: [200, 230, 201], fontStyle: "bold", textColor: [21, 92, 56] }
              : verdict === "fail"
                ? { fillColor: [255, 205, 210], fontStyle: "bold", textColor: [155, 44, 44] }
                : { textColor: 90 },
        });
        return cells;
      }),
      columnStyles: vis[0]?.id === "mesa" ? { 0: { cellWidth: 22 } } : {},
      didParseCell: (data) => {
        if (data.section !== "head" || data.row.index !== 1) return;
        if (data.column.index >= vis.length) return;
        const column = vis[data.column.index];
        if (!column) return;
        if (column.group === "float") data.cell.styles.fillColor = [200, 230, 201];
        if (column.group === "iso") data.cell.styles.fillColor = [255, 224, 178];
      },
    });

    doc.setPage(index + 1);
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")}  ·  Página ${index + 1} de ${workbook.inverters.length}`,
      margin,
      200,
    );
  });

  const output = doc.output("arraybuffer");
  return new Uint8Array(output);
}

function pdfHead(config: ColumnConfig) {
  const groups: ColumnGroup[] = ["id", "float", "iso"];
  const groupRow = groups.flatMap((group) => {
    const span = groupSpan(config, group);
    if (!span) return [];
    const styles =
      group === "id"
        ? { fillColor: [233, 236, 239] as [number, number, number] }
        : group === "float"
          ? { fillColor: [76, 175, 80] as [number, number, number], textColor: 255 }
          : { fillColor: [230, 126, 34] as [number, number, number], textColor: 255 };
    return [{ content: GROUP_LABEL[group], colSpan: span, styles }];
  });
  groupRow.push({
    content: "Resultado",
    colSpan: 1,
    styles: { fillColor: [23, 54, 40] as [number, number, number], textColor: 255 },
  });
  return [groupRow, [...visibleColumns(config).map((column) => column.label), "Aprov."]];
}
