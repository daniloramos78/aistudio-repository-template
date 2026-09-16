/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { DRAFT_KEY, LAYOUTS_KEY, RECENT_KEY } from "./types";

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function typeInto(input: HTMLInputElement, value: string) {
  act(() => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function fillCell(host: HTMLElement, label: string, value: string) {
  const input = () => host.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
  typeInto(input(), value);
  act(() => {
    input().blur();
  });
}

describe("App grid", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.stubGlobal("confirm", () => false);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root.render(<App />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(RECENT_KEY);
    window.localStorage.removeItem(LAYOUTS_KEY);
  });

  it("adds an empty string row that accepts typed values", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    expect(addString).toBeTruthy();
    click(addString!);

    const sheetInputs = Array.from(host.querySelectorAll(".sheet td input")) as HTMLInputElement[];
    expect(sheetInputs.length).toBeGreaterThan(0);
    expect(sheetInputs.every((input) => input.value === "")).toBe(true);

    const voc = sheetInputs.find((input) => input.getAttribute("aria-label") === "tensaoVoc");
    expect(voc).toBeTruthy();
    typeInto(voc!, "1002V");
    expect((host.querySelector('[aria-label="tensaoVoc"]') as HTMLInputElement).value).toBe("1002V");
  });

  it("accepts typing in floating cells after choosing seção and polaridade", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);

    const secao = host.querySelector('[aria-label="secaoCondutor"]') as HTMLSelectElement;
    act(() => {
      secao.focus();
      secao.value = "2,5";
      secao.dispatchEvent(new Event("change", { bubbles: true }));
      secao.blur();
    });
    const pol = host.querySelector('[aria-label="polaridade"]') as HTMLSelectElement;
    act(() => {
      pol.focus();
      pol.value = "Ok";
      pol.dispatchEvent(new Event("change", { bubbles: true }));
      pol.blur();
    });

    const pos = host.querySelector('[aria-label="flutPositivo"]') as HTMLInputElement;
    act(() => { pos.focus(); });
    typeInto(pos, "21");
    expect(pos.value).toBe("21");
    typeInto(pos, "21V");
    act(() => { pos.blur(); });
    expect((host.querySelector('[aria-label="flutPositivo"]') as HTMLInputElement).value).toBe("21V");
    expect((host.querySelector('[aria-label="secaoCondutor"]') as HTMLSelectElement).value).toBe("2,5");
    expect((host.querySelector('[aria-label="polaridade"]') as HTMLSelectElement).value).toBe("Ok");
  });

  it("skips the read-only Corr. 20°C cell when tabbing", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    click(addString!);
    const gohm = host.querySelector('[aria-label="isolamentoGohm"]') as HTMLInputElement;
    act(() => { gohm.focus(); });
    act(() => {
      gohm.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(document.activeElement).toBe(host.querySelectorAll('[aria-label="mesa"]')[1]);
  });

  it("keeps typed header and cell text while the rest of the sheet re-renders", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    const vocHeader = Array.from(host.querySelectorAll(".criteria input"))[0] as HTMLInputElement;
    typeInto(vocHeader, "1000");
    expect(vocHeader.value).toBe("1000");
    const sheetVoc = host.querySelector('[aria-label="tensaoVoc"]') as HTMLInputElement;
    typeInto(sheetVoc, "1002V");
    expect(sheetVoc.value).toBe("1002V");
    const erro = Array.from(host.querySelectorAll(".criteria input"))[1] as HTMLInputElement;
    typeInto(erro, "5");
    expect(vocHeader.value).toBe("1000");
    expect(erro.value).toBe("5");
    expect((host.querySelector('[aria-label="tensaoVoc"]') as HTMLInputElement).value).toBe("1002V");
  });

  it("moves to the cell below with Enter and undoes the value with Ctrl+Z", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    click(addString!);

    const mesas = () => Array.from(host.querySelectorAll('[aria-label="mesa"]')) as HTMLInputElement[];
    expect(mesas()).toHaveLength(2);
    typeInto(mesas()[0], "Mesa 01");
    act(() => {
      mesas()[0].dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(mesas()[0].value).toBe("Mesa 01");
    expect(document.activeElement).toBe(mesas()[1]);

    act(() => {
      mesas()[1].dispatchEvent(new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(mesas()[0].value).toBe("");
  });

  it("has no Adicionar mesa button and lets the user type mesa names on strings", () => {
    expect(
      Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "Adicionar mesa"),
    ).toBe(false);
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    const mesa = host.querySelector('[aria-label="mesa"]') as HTMLInputElement;
    expect(mesa).toBeTruthy();
    typeInto(mesa, "Mesa 07");
    act(() => { mesa.blur(); });
    expect(mesa.value).toBe("Mesa 07");
    expect((host.querySelector('[aria-label="stringNo"]') as HTMLInputElement).value).toBe("");
    expect(host.querySelector('[aria-label="secaoCondutor"]')).toBeTruthy();
    expect(host.textContent).toContain("Corr. 20°C");
  });

  it("starts a new sheet with empty criteria, isolation options and no TΩ column", () => {
    expect(host.textContent).toContain("Voc esperada da string");
    expect(host.textContent).toContain("Erro ± (%)");
    expect(host.textContent).toContain("Tensão do módulo");
    expect(host.textContent).toContain("Endereço");
    const criteria = Array.from(host.querySelectorAll(".criteria input")) as HTMLInputElement[];
    expect(criteria.map((input) => input.value)).toEqual(["", "", ""]);
    const isolation = host.querySelector(".criteria select") as HTMLSelectElement;
    expect(isolation.value).toBe("nbr5410");
    expect(isolation.textContent).toMatch(/NBR 16690/);
    expect(isolation.textContent).toMatch(/SELV\/PELV/);
    const headers = Array.from(host.querySelectorAll(".sheet thead tr:last-child th")).map(
      (th) => th.textContent,
    );
    expect(headers).not.toContain("TΩ");
    expect(headers).toContain("Tensão Aplicada");
    expect(headers).toContain("Tempo");
    expect(headers).toContain("Seção mm²");
    expect(headers).toContain("Corr. 20°C");
    expect(headers).toContain("Aprov.");
    const groups = Array.from(host.querySelectorAll(".sheet thead .group")).map((th) => th.textContent);
    expect(groups).toContain("Teste de Isolação");
    expect(groups).toContain("Resultado");
  });

  it("hides tempo and ohm columns when tensão aplicada is unchecked", () => {
    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    const tensaoLabel = Array.from(host.querySelectorAll(".modal label.check")).find((label) =>
      label.textContent?.includes("Tensão Aplicada"),
    );
    click(tensaoLabel!.querySelector("input")!);
    const tempo = Array.from(host.querySelectorAll(".modal label.check")).find((label) =>
      label.textContent?.trim() === "Tempo",
    )?.querySelector("input") as HTMLInputElement;
    expect(tempo.checked).toBe(false);
    const apply = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Aplicar",
    );
    click(apply!);
    const headers = Array.from(host.querySelectorAll(".sheet thead tr:last-child th")).map(
      (th) => th.textContent,
    );
    expect(headers).not.toContain("Tensão Aplicada");
    expect(headers).not.toContain("Tempo");
    expect(headers).not.toContain("MΩ");
    expect(headers).not.toContain("Corr. 20°C");
    expect(headers).toContain("Positivo + T");
    const open = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Instrumentos" || button.textContent === "Instrumentos ✓",
    );
    click(open!);
    const dialog = host.querySelector('[aria-labelledby="instruments-title"]') as HTMLElement;
    expect(dialog.textContent).toContain("Multímetro");
    expect(dialog.textContent).not.toContain("Megômetro");
  });

  it("copies tensão aplicada and tempo onto the next string", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    click(addString!);
    fillCell(host, "tensaoAplicada", "1kV");
    fillCell(host, "isolamentoTempo", "60s");
    const tensoesBefore = Array.from(
      host.querySelectorAll('[aria-label="tensaoAplicada"]'),
    ) as HTMLInputElement[];
    const temposBefore = Array.from(
      host.querySelectorAll('[aria-label="isolamentoTempo"]'),
    ) as HTMLInputElement[];
    expect(tensoesBefore).toHaveLength(2);
    expect(tensoesBefore[1].value).toBe("1kV");
    expect(temposBefore[1].value).toBe("60s");
    click(addString!);
    const tensoes = Array.from(host.querySelectorAll('[aria-label="tensaoAplicada"]')) as HTMLInputElement[];
    const tempos = Array.from(host.querySelectorAll('[aria-label="isolamentoTempo"]')) as HTMLInputElement[];
    expect(tensoes).toHaveLength(3);
    expect(tensoes[1].value).toBe("1kV");
    expect(tensoes[2].value).toBe("1kV");
    expect(tempos[1].value).toBe("60s");
    expect(tempos[2].value).toBe("60s");
    expect((host.querySelectorAll('[aria-label="tensaoVoc"]')[2] as HTMLInputElement).value).toBe("");
  });

  it("fails the row if only one floating pole stays below the module voltage", () => {
    const [voc, erro, modulo] = Array.from(host.querySelectorAll(".criteria input")) as HTMLInputElement[];
    typeInto(voc, "1000");
    act(() => { voc.blur(); });
    typeInto(erro, "5");
    act(() => { erro.blur(); });
    typeInto(modulo, "46,7");
    act(() => { modulo.blur(); });
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    fillCell(host, "tensaoVoc", "1000");
    act(() => {
      const polarity = host.querySelector('[aria-label="polaridade"]') as HTMLSelectElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(polarity, "Ok");
      polarity.dispatchEvent(new Event("change", { bubbles: true }));
    });
    fillCell(host, "flutPositivo", "45,9V");
    fillCell(host, "flutNegativo", "48");
    fillCell(host, "isolamentoMohm", "1,2");
    expect(host.querySelector('[aria-label="Reprovado"]')).toBeTruthy();

    fillCell(host, "flutNegativo", "45,2");
    expect(host.querySelector('[aria-label="Aprovado"]')).toBeTruthy();
  });

  it("hides the mesa column from Configuração", () => {
    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    const small = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Usina pequena",
    );
    click(small!);
    const apply = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Aplicar",
    );
    click(apply!);

    expect(
      Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "Adicionar mesa"),
    ).toBe(false);
    const headers = Array.from(host.querySelectorAll(".sheet thead tr:last-child th"))
      .map((th) => th.textContent)
      .filter(Boolean);
    expect(headers).toEqual(["String", "MPPT", "Tensão Voc", "Polaridade", "Positivo + T", "Negativo + T", "Aprov."]);
    expect(host.textContent).not.toContain("Teste de Isolação");
    expect(host.textContent).not.toContain("Isolação");

    const open = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Instrumentos" || button.textContent === "Instrumentos ✓",
    );
    click(open!);
    const dialog = host.querySelector('[aria-labelledby="instruments-title"]') as HTMLElement;
    expect(dialog.textContent).toContain("Multímetro");
    expect(dialog.textContent).not.toContain("Megômetro");
  });

  it("places Adicionar inversor next to Adicionar string and not in the tabs", () => {
    const tabs = host.querySelector(".tabs") as HTMLElement;
    expect(Array.from(tabs.querySelectorAll("button")).map((button) => button.textContent)).not.toContain("+ Inversor");
    const actions = Array.from(host.querySelectorAll(".sheet-toolbar .actions button")).map(
      (button) => button.textContent,
    );
    expect(actions).toEqual(["Adicionar inversor", "Adicionar string"]);
    const before = host.querySelectorAll(".tabs .tab").length;
    const addInv = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar inversor",
    );
    click(addInv!);
    expect(host.querySelectorAll(".tabs .tab")).toHaveLength(before + 1);
    expect(host.textContent).toContain("INVERSOR_05");
  });

  it("records multimeter and megohmmeter identification in Instrumentos", () => {
    const open = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Instrumentos",
    );
    click(open!);
    const dialog = host.querySelector('[aria-labelledby="instruments-title"]') as HTMLElement;
    expect(dialog.textContent).toContain("Multímetro / alicate amperímetro");
    expect(dialog.textContent).toContain("Megômetro");
    expect(dialog.textContent).toContain("Número de série");
    expect(dialog.textContent).toMatch(/certificado/i);
    expect(dialog.textContent).toContain("Validade");

    const first = dialog.querySelector("input") as HTMLInputElement;
    typeInto(first, "Fluke 87V");
    act(() => { first.blur(); });
    expect(first.value).toBe("Fluke 87V");

    const close = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent === "Fechar",
    );
    click(close!);
    expect(host.querySelector('[aria-labelledby="instruments-title"]')).toBeNull();
    expect(host.textContent).toContain("Instrumentos ✓");
  });

  it("paints alternating mesa cells on the grid", () => {
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    click(addString!);
    click(addString!);
    const mesas = () => Array.from(host.querySelectorAll('[aria-label="mesa"]')) as HTMLInputElement[];
    typeInto(mesas()[0], "Mesa 01");
    act(() => { mesas()[0].blur(); });
    typeInto(mesas()[1], "Mesa 01");
    act(() => { mesas()[1].blur(); });
    typeInto(mesas()[2], "Mesa 02");
    act(() => { mesas()[2].blur(); });
    expect(mesas()[0].closest("td")?.className).toContain("band-a");
    expect(mesas()[1].closest("td")?.className).toContain("band-a");
    expect(mesas()[2].closest("td")?.className).toContain("band-b");
  });

  it("saves a custom small-plant layout and reloads it", () => {
    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    const pv = Array.from(host.querySelectorAll(".modal label.check")).find((label) =>
      label.textContent?.trim() === "PV",
    )?.querySelector("input") as HTMLInputElement;
    expect(pv.checked).toBe(true);
    click(pv);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Salvar como usina pequena")!);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Usina grande")!);
    expect(
      (Array.from(host.querySelectorAll(".modal label.check")).find((label) =>
        label.textContent?.trim() === "PV",
      )?.querySelector("input") as HTMLInputElement).checked,
    ).toBe(true);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Usina pequena")!);
    expect(
      (Array.from(host.querySelectorAll(".modal label.check")).find((label) =>
        label.textContent?.trim() === "PV",
      )?.querySelector("input") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("switches the on-screen sheet to grayscale from Configuração", () => {
    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    expect(host.textContent).toContain("Planilha na tela");
    expect(host.textContent).toContain("Impressão e PDF");
    const mono = Array.from(host.querySelectorAll(".config-appearance label")).find((label) =>
      label.textContent?.includes("Preto e branco (cinza)"),
    )?.querySelector("input") as HTMLInputElement;
    click(mono);
    const printMono = Array.from(host.querySelectorAll(".config-appearance label")).find((label) =>
      label.textContent?.trim() === "Preto e branco",
    )?.querySelector("input") as HTMLInputElement;
    click(printMono);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Aplicar")!);
    expect(host.querySelector(".app")?.classList.contains("mono")).toBe(true);
  });

  it("shows a humidity alert and corrected isolation only when isolation is on", () => {
    const umidade = host.querySelector(".meta input[placeholder='40.00']") as HTMLInputElement;
    typeInto(umidade, "85");
    act(() => { umidade.blur(); });
    expect(host.textContent).toMatch(/Umidade acima de 80%/);
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    fillCell(host, "isolamentoGohm", "5.5");
    const corrected = host.querySelector('[aria-label="isolamentoCorrigido"]') as HTMLInputElement;
    expect(corrected.value).toBe("—");
    const temp = host.querySelector(".meta input[placeholder='33']") as HTMLInputElement;
    typeInto(temp, "29");
    act(() => { temp.blur(); });
    expect((host.querySelector('[aria-label="isolamentoCorrigido"]') as HTMLInputElement).value).toMatch(/GΩ/);

    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Usina pequena")!);
    click(Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Aplicar")!);
    expect(host.querySelector('[aria-label="isolamentoCorrigido"]')).toBeNull();
    expect(host.textContent).not.toMatch(/Umidade acima de 80%/);
  });

  it("inserts header and sheet characters from keydown only (Electron)", () => {
    vi.useFakeTimers();
    const ufv = host.querySelector('input[placeholder="Ex.: Manga G. 05"]') as HTMLInputElement;
    expect(ufv).toBeTruthy();
    act(() => { ufv.focus(); });
    act(() => {
      ufv.dispatchEvent(new KeyboardEvent("keydown", { key: "M", bubbles: true, cancelable: true }));
    });
    act(() => { vi.runAllTimers(); });
    expect(ufv.value).toBe("M");

    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    const voc = host.querySelector('[aria-label="tensaoVoc"]') as HTMLInputElement;
    act(() => { voc.focus(); });
    act(() => {
      voc.dispatchEvent(new KeyboardEvent("keydown", { key: "9", bubbles: true, cancelable: true }));
    });
    act(() => { vi.runAllTimers(); });
    expect(voc.value).toBe("9");

    const open = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Instrumentos" || button.textContent === "Instrumentos ✓",
    );
    click(open!);
    const dialog = host.querySelector('[aria-labelledby="instruments-title"]') as HTMLElement;
    const instrument = dialog.querySelector("input") as HTMLInputElement;
    act(() => { instrument.focus(); });
    act(() => {
      instrument.dispatchEvent(new KeyboardEvent("keydown", { key: "F", bubbles: true, cancelable: true }));
    });
    act(() => { vi.runAllTimers(); });
    expect(instrument.value).toBe("F");
    vi.useRealTimers();
  });
});
