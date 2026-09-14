/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { DRAFT_KEY, RECENT_KEY } from "./types";

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

  it("hides the mesa column from Configuração", () => {
    const config = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Configuração",
    );
    click(config!);
    const small = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Usina pequena (sem mesa)",
    );
    click(small!);
    const apply = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Aplicar",
    );
    click(apply!);

    expect(
      Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "Adicionar mesa"),
    ).toBe(false);
    expect(host.textContent).not.toMatch(/Identificação[\s\S]*Mesa[\s\S]*String/);
    const headers = Array.from(host.querySelectorAll(".sheet thead tr:last-child th")).map(
      (th) => th.textContent,
    );
    expect(headers).not.toContain("Mesa");
    expect(headers).toContain("String");
    expect(headers).toContain("MPPT");
  });
});
