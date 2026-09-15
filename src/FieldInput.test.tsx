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

  it("keeps typed text locally and only notifies the parent on blur", () => {
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
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(input.value).toBe("Manga");
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      input.blur();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("Manga");

    act(() => {
      root.unmount();
    });
  });
});
