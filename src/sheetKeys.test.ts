import { describe, expect, it } from "vitest";
import { isRedoKey, isUndoKey, keyMove, moveCell } from "./sheetKeys";

describe("sheetKeys", () => {
  it("moves like a spreadsheet", () => {
    expect(moveCell({ row: 0, col: 0 }, "right", 2, 3)).toEqual({ row: 0, col: 1 });
    expect(moveCell({ row: 0, col: 2 }, "right", 2, 3)).toEqual({ row: 1, col: 0 });
    expect(moveCell({ row: 1, col: 0 }, "left", 2, 3)).toEqual({ row: 0, col: 2 });
    expect(moveCell({ row: 0, col: 1 }, "down", 2, 3)).toEqual({ row: 1, col: 1 });
    expect(moveCell({ row: 0, col: 1 }, "up", 2, 3)).toEqual({ row: 0, col: 1 });
    expect(moveCell({ row: 1, col: 1 }, "home", 2, 3)).toEqual({ row: 1, col: 0 });
    expect(moveCell({ row: 1, col: 1 }, "first", 2, 3)).toEqual({ row: 0, col: 0 });
  });

  it("maps Excel/LibreOffice keys", () => {
    expect(keyMove({ key: "Enter", shiftKey: false })).toBe("down");
    expect(keyMove({ key: "Enter", shiftKey: true })).toBe("up");
    expect(keyMove({ key: "Tab", shiftKey: false })).toBe("right");
    expect(keyMove({ key: "Tab", shiftKey: true })).toBe("left");
    expect(keyMove({ key: "ArrowRight", shiftKey: false })).toBe("right");
    expect(keyMove({ key: "ArrowLeft", shiftKey: false })).toBe("left");
  });

  it("maps undo and redo", () => {
    expect(isUndoKey({ key: "z", shiftKey: false, ctrlKey: true, metaKey: false })).toBe(true);
    expect(isRedoKey({ key: "y", shiftKey: false, ctrlKey: true, metaKey: false })).toBe(true);
    expect(isRedoKey({ key: "z", shiftKey: true, ctrlKey: true, metaKey: false })).toBe(true);
  });
});
