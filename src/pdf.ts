import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Workbook } from "./types";
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

export function buildPdf(workbook: Workbook): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  registerOhmFont(doc);
  const margin = 10;

  workbook.inverters.forEach((inverter, index) => {
    if (index > 0) doc.addPage();

    doc.setFont(FONT, "bold");
    doc.setFontSize(14);
    doc.text("Planilha de Testes UFV", margin, 12);

    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    doc.text(`UFV: ${workbook.ufv || "—"}`, margin, 19);
    doc.text(`Data: ${fmtDate(workbook.data) || "—"}`, 80, 19);
    doc.text(`Umidade: ${workbook.umidade ? `${workbook.umidade}%` : "—"}`, 130, 19);
    doc.text(`Temperatura: ${workbook.temperatura ? `${workbook.temperatura}°C` : "—"}`, 185, 19);
    doc.text(inverter.name, 250, 19, { align: "right" });

    if (workbook.tecnico) {
      doc.text(`Técnico: ${workbook.tecnico}`, margin, 25);
    }
    if (workbook.observacoes) {
      doc.text(`Observações: ${workbook.observacoes}`, 80, 25);
    }

    autoTable(doc, {
      startY: workbook.tecnico || workbook.observacoes ? 29 : 28,
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
      head: [
        [
          { content: "", colSpan: 6, styles: { fillColor: [233, 236, 239] } },
          { content: "Teste de Flutuação", colSpan: 3, styles: { fillColor: [76, 175, 80], textColor: 255 } },
          { content: "Teste de Isolação", colSpan: 3, styles: { fillColor: [230, 126, 34], textColor: 255 } },
        ],
        [
          "Mesa",
          "String",
          "PV",
          "MPPT",
          "Tensão Voc",
          "Polaridade",
          "Positivo + T",
          "Negativo + T",
          "Tensão Aplicada",
          "Tempo",
          "M\u03A9",
          "G\u03A9",
        ],
      ],
      body: inverter.rows.map((row, rowIndex) => {
        const first =
          rowIndex === 0 || row.mesa.trim() !== inverter.rows[rowIndex - 1].mesa.trim();
        return [
          {
            content: row.mesa,
            styles: first
              ? { fillColor: [255, 241, 118], fontStyle: "bold", textColor: 20 }
              : { textColor: 90 },
          },
          row.stringNo,
          row.pv,
          row.mppt,
          row.tensaoVoc,
          row.polaridade,
          row.flutPositivo,
          row.flutNegativo,
          row.tensaoAplicada,
          row.isolamentoTempo,
          row.isolamentoMohm,
          row.isolamentoGohm,
        ];
      }),
      columnStyles: {
        0: { cellWidth: 22 },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.row.index === 1) {
          if (data.column.index >= 6 && data.column.index <= 8) {
            data.cell.styles.fillColor = [200, 230, 201];
          }
          if (data.column.index >= 9) {
            data.cell.styles.fillColor = [255, 224, 178];
          }
        }
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
