import { suggestedFileName, suggestedPdfName } from "./workbook";
import type { Workbook } from "./types";

export interface DesktopApi {
  openFile: () => Promise<{ filePath: string; contents: string } | null>;
  saveFile: (
    filePath: string | null,
    contents: string,
    defaultName?: string,
  ) => Promise<{ filePath: string } | null>;
  savePdf: (
    data: string,
    defaultName: string,
  ) => Promise<{ filePath: string } | null>;
  getDataFolder: () => Promise<string>;
  autosave: (contents: string) => Promise<{ filePath: string } | null>;
  loadAutosave: () => Promise<{ filePath: string; contents: string } | null>;
  clearAutosave: () => Promise<void>;
}

declare global {
  interface Window {
    desktop?: DesktopApi;
    flushAutosave?: () => Promise<unknown> | unknown;
  }
}

export const isDesktop = typeof window !== "undefined" && Boolean(window.desktop);

export async function openWorkbookFile(): Promise<{
  filePath: string | null;
  contents: string;
} | null> {
  if (window.desktop) {
    return window.desktop.openFile();
  }
  return pickLocalFile(".json,.ufv.json,application/json");
}

export async function saveWorkbookFile(
  workbook: Workbook,
  contents: string,
  currentPath: string | null,
  saveAs: boolean,
): Promise<string | null> {
  if (window.desktop) {
    const result = await window.desktop.saveFile(
      saveAs ? null : currentPath,
      contents,
      suggestedFileName(workbook),
    );
    return result?.filePath ?? null;
  }
  downloadText(suggestedFileName(workbook), contents);
  return currentPath ?? suggestedFileName(workbook);
}

export async function savePdfFile(
  workbook: Workbook,
  bytes: Uint8Array,
): Promise<string | null> {
  const name = suggestedPdfName(workbook);
  if (window.desktop) {
    const base64 = uint8ToBase64(bytes);
    const result = await window.desktop.savePdf(base64, name);
    return result?.filePath ?? null;
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(name, new Blob([copy], { type: "application/pdf" }));
  return name;
}

function pickLocalFile(accept: string): Promise<{ filePath: string | null; contents: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ filePath: file.name, contents: await file.text() });
    };
    input.click();
  });
}

function downloadText(name: string, contents: string) {
  downloadBlob(name, new Blob([contents], { type: "application/json" }));
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
