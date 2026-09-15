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

  it("opens the mesa dialog instead of window.prompt", () => {
    const prompt = vi.fn();
    vi.stubGlobal("prompt", prompt);
    const addMesa = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar mesa",
    );
    expect(addMesa).toBeTruthy();
    click(addMesa!);
    expect(prompt).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Adicionar mesa");
    expect(host.textContent).toContain("Quantidade de strings");

    const dialog = host.querySelector('[aria-labelledby="mesa-title"]');
    const name = dialog?.querySelector("input") as HTMLInputElement;
    typeInto(name, "Mesa 07");
    const confirm = Array.from(dialog!.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar",
    );
    click(confirm!);

    const mesa = host.querySelector('[aria-label="mesa"]') as HTMLInputElement;
    expect(mesa.value).toBe("Mesa 07");
    const stringNo = host.querySelector('[aria-label="stringNo"]') as HTMLInputElement;
    expect(stringNo.value).toBe("");
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
    const addMesaBtn = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar mesa",
    );
    click(addMesaBtn!);
    const confirm = Array.from(host.querySelectorAll(".modal button")).find(
      (button) => button.textContent === "Adicionar",
    );
    click(confirm!);
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
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
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
    expect(actions).toEqual(["Adicionar mesa", "Adicionar inversor", "Adicionar string"]);
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
    const addMesa = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar mesa",
    );
    click(addMesa!);
    const dialog = host.querySelector('[aria-labelledby="mesa-title"]');
    typeInto(dialog!.querySelector("input") as HTMLInputElement, "Mesa 01");
    click(Array.from(dialog!.querySelectorAll("button")).find((button) => button.textContent === "Adicionar")!);
    const addString = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Adicionar string",
    );
    click(addString!);
    const mesas = () => Array.from(host.querySelectorAll('[aria-label="mesa"]')) as HTMLInputElement[];
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
});
