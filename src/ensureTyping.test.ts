/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { installTypingGuard, isEditing, resetTypingGuardForTests } from "./ensureTyping";

describe("ensureTyping", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
    resetTypingGuardForTests();
  });

  it("inserts a character when the browser never updates the input", () => {
    vi.useFakeTimers();
    installTypingGuard();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(isEditing(input)).toBe(true);

    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "M",
      bubbles: true,
      cancelable: true,
    }));
    expect(input.value).toBe("");
    vi.runAllTimers();
    expect(input.value).toBe("M");
  });

  it("does not double-insert when the browser already accepted the key", () => {
    vi.useFakeTimers();
    installTypingGuard();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    input.addEventListener("keydown", () => {
      input.value = "A";
    });
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "A",
      bubbles: true,
      cancelable: true,
    }));
    vi.runAllTimers();
    expect(input.value).toBe("A");
  });
});
