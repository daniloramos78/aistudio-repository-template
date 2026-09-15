import type { ColumnId } from "./types";

export type CellPos = { row: number; col: number };

export type MoveDir = "left" | "right" | "up" | "down" | "home" | "end" | "first" | "last";

export function moveCell(
  pos: CellPos,
  dir: MoveDir,
  rowCount: number,
  colCount: number,
): CellPos {
  if (rowCount <= 0 || colCount <= 0) return pos;
  let row = pos.row;
  let col = pos.col;
  if (dir === "left") {
    col -= 1;
    if (col < 0) {
      col = colCount - 1;
      row -= 1;
    }
  } else if (dir === "right") {
    col += 1;
    if (col >= colCount) {
      col = 0;
      row += 1;
    }
  } else if (dir === "up") {
    row -= 1;
  } else if (dir === "down") {
    row += 1;
  } else if (dir === "home") {
    col = 0;
  } else if (dir === "end") {
    col = colCount - 1;
  } else if (dir === "first") {
    return { row: 0, col: 0 };
  } else if (dir === "last") {
    return { row: rowCount - 1, col: colCount - 1 };
  }
  row = Math.max(0, Math.min(rowCount - 1, row));
  col = Math.max(0, Math.min(colCount - 1, col));
  return { row, col };
}

export function keyMove(event: KeyboardEvent | { key: string; shiftKey: boolean; ctrlKey?: boolean; metaKey?: boolean }): MoveDir | null {
  const ctrl = Boolean(event.ctrlKey || event.metaKey);
  if (event.key === "Enter") return event.shiftKey ? "up" : "down";
  if (event.key === "Tab") return event.shiftKey ? "left" : "right";
  if (event.key === "ArrowLeft" && !ctrl) return "left";
  if (event.key === "ArrowRight" && !ctrl) return "right";
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
  if (event.key === "Home") return ctrl ? "first" : "home";
  if (event.key === "End") return ctrl ? "last" : "end";
  return null;
}

export function isUndoKey(event: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): boolean {
  const ctrl = event.ctrlKey || event.metaKey;
  return ctrl && event.key.toLowerCase() === "z" && !event.shiftKey;
}

export function isRedoKey(event: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): boolean {
  const ctrl = event.ctrlKey || event.metaKey;
  if (!ctrl) return false;
  if (event.key.toLowerCase() === "y") return true;
  return event.key.toLowerCase() === "z" && event.shiftKey;
}

export function cellKey(rowIndex: number, columnId: ColumnId): string {
  return `${rowIndex}:${columnId}`;
}
