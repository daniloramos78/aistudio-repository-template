import { describe, expect, it } from "vitest";
import { isDemoPage } from "./demo";

describe("isDemoPage", () => {
  it("detects the test page query string", () => {
    expect(isDemoPage("?demo=1", "")).toBe(true);
    expect(isDemoPage("?pagina=teste", "")).toBe(true);
    expect(isDemoPage("", "#teste")).toBe(true);
    expect(isDemoPage("", "")).toBe(false);
  });
});
