/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FieldInput from "./FieldInput";

describe("FieldInput", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    host?.remove();
  });

  it("keeps typed text in the DOM even when the parent re-renders with the old value", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const onChange = vi.fn();

    act(() => {
      root.render(<FieldInput value="" onChange={onChange} aria-label="ufv" />);
    });

    const input = host.querySelector("input") as HTMLInputElement;
    act(() => {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "Manga");
    });

    expect(input.value).toBe("Manga");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      root.render(<FieldInput value="" onChange={onChange} aria-label="ufv" />);
    });
    expect(input.value).toBe("Manga");

    act(() => {
      input.blur();
    });
    expect(onChange).toHaveBeenCalledWith("Manga");

    act(() => {
      root.unmount();
    });
  });

  it("notifies the parent from a native input event", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const onChange = vi.fn();

    act(() => {
      root.render(<FieldInput value="" onChange={onChange} aria-label="ufv" />);
    });

    const input = host.querySelector("input") as HTMLInputElement;
    act(() => {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "33");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("33");

    act(() => {
      root.unmount();
    });
  });
});
