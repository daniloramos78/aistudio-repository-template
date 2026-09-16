import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import { isFirstOfMesa, mesaColorBand, propagateIsolation } from "./workbook";
import { CONDUCTOR_SECTIONS, rowValue, type ColumnId, type DisplayColumnId } from "./columns";
import { isEditing } from "./ensureTyping";
import { isRedoKey, isUndoKey, keyMove, moveCell, type CellPos } from "./sheetKeys";
import type { TestRow } from "./types";
import { verdictLabel, type Verdict } from "./verdict";

interface SheetGridProps {
  rows: TestRow[];
  columns: DisplayColumnId[];
  verdicts: Verdict[];
  correctedValues: string[];
  onRowsChange: (mutate: (rows: TestRow[]) => TestRow[], recordHistory?: boolean) => void;
  onRemove: (rowId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

function focusSheetPos(pos: CellPos, select = true) {
  const el = document.querySelector(`[data-sheet-pos="${pos.row}:${pos.col}"]`);
  if (!(el instanceof HTMLElement)) return;
  el.focus();
  if (select && el instanceof HTMLInputElement && !el.readOnly) el.select();
}

function nextCell(pos: CellPos, dir: NonNullable<ReturnType<typeof keyMove>>, rowCount: number, columns: DisplayColumnId[]): CellPos {
  let next = moveCell(pos, dir, rowCount, columns.length);
  const step = dir === "home" || dir === "first"
    ? "right"
    : dir === "end" || dir === "last"
      ? "left"
      : dir;
  for (let i = 0; i < columns.length + 1; i += 1) {
    if (columns[next.col] !== "isolamentoCorrigido") return next;
    const after = moveCell(next, step, rowCount, columns.length);
    if (after.row === next.row && after.col === next.col) return after;
    next = after;
  }
  return next;
}

function SheetGrid({
  rows,
  columns,
  verdicts,
  correctedValues,
  onRowsChange,
  onRemove,
  onUndo,
  onRedo,
}: SheetGridProps) {
  const [active, setActive] = useState<CellPos>({ row: 0, col: 0 });
  const prevLen = useRef(rows.length);
  const pendingFocus = useRef<CellPos | null>(null);

  useLayoutEffect(() => {
    if (rows.length > prevLen.current) {
      const row = prevLen.current;
      const pos = { row, col: 0 };
      setActive(pos);
      pendingFocus.current = pos;
    } else if (rows.length > 0) {
      setActive((pos) => {
        const row = Math.min(pos.row, rows.length - 1);
        const col = Math.min(pos.col, Math.max(0, columns.length - 1));
        if (row === pos.row && col === pos.col) return pos;
        return { row, col };
      });
    }
    prevLen.current = rows.length;
  }, [rows.length, columns.length]);

  useLayoutEffect(() => {
    const pos = pendingFocus.current;
    if (!pos) return;
    pendingFocus.current = null;
    focusSheetPos(pos);
  });

  const go = useCallback((dir: NonNullable<ReturnType<typeof keyMove>>) => {
    setActive((pos) => {
      const next = nextCell(pos, dir, rows.length, columns);
      pendingFocus.current = next;
      return next;
    });
  }, [rows.length, columns]);

  const activate = useCallback((row: number, col: number) => {
    setActive((pos) => (pos.row === row && pos.col === col ? pos : { row, col }));
  }, []);

  const commit = useCallback((rowId: string, columnId: ColumnId, value: string) => {
    onRowsChange((current) => {
      const row = current.find((item) => item.id === rowId);
      if (!row || rowValue(row, columnId) === value) return current;
      if (columnId === "tensaoAplicada" || columnId === "isolamentoTempo") {
        return propagateIsolation(current, rowId, columnId, value);
      }
      return current.map((item) =>
        item.id === rowId ? { ...item, [columnId]: value } as TestRow : item,
      );
    }, true);
  }, [onRowsChange]);

  if (rows.length === 0) return null;

  return (
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={row.id}>
          {columns.map((columnId, colIndex) => (
            <SheetCell
              key={columnId}
              row={row}
              rowIndex={rowIndex}
              columnId={columnId}
              colIndex={colIndex}
              first={isFirstOfMesa(rows, rowIndex)}
              band={mesaColorBand(rows, rowIndex)}
              computedValue={columnId === "isolamentoCorrigido" ? (correctedValues[rowIndex] ?? "") : undefined}
              active={active.row === rowIndex && active.col === colIndex}
              onActivate={() => activate(rowIndex, colIndex)}
              onCommit={(value) => {
                if (columnId === "isolamentoCorrigido") return;
                commit(row.id, columnId, value);
              }}
              onNavigate={go}
              onUndo={onUndo}
              onRedo={onRedo}
            />
          ))}
          <td className={`verdict ${verdicts[rowIndex] ?? "pending"}`} title={verdictLabel(verdicts[rowIndex] ?? "pending")}>
            <span className="verdict-dot" aria-label={verdictLabel(verdicts[rowIndex] ?? "pending")}>
              {(verdicts[rowIndex] ?? "pending") === "pass" ? "✓" : (verdicts[rowIndex] ?? "pending") === "fail" ? "✕" : "•"}
            </span>
          </td>
          <td className="no-print">
            <button type="button" className="row-x" onClick={() => onRemove(row.id)} title="Excluir linha">
              ×
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function SheetCell({
  row,
  rowIndex,
  columnId,
  colIndex,
  first,
  band,
  computedValue,
  active,
  onActivate,
  onCommit,
  onNavigate,
  onUndo,
  onRedo,
}: {
  row: TestRow;
  rowIndex: number;
  columnId: DisplayColumnId;
  colIndex: number;
  first: boolean;
  band: "a" | "b";
  computedValue?: string;
  active: boolean;
  onActivate: () => void;
  onCommit: (value: string) => void;
  onNavigate: (dir: NonNullable<ReturnType<typeof keyMove>>) => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const committed = columnId === "isolamentoCorrigido"
    ? (computedValue ?? "")
    : rowValue(row, columnId);
  const committedRef = useRef(committed);
  committedRef.current = committed;
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const pos = `${rowIndex}:${colIndex}`;

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || isEditing(el)) return;
    if (el.value !== committed) el.value = committed;
  }, [committed]);

  const flush = (sync = false) => {
    const el = inputRef.current;
    const value = el && "value" in el ? el.value : committedRef.current;
    if (value === committedRef.current) return;
    if (sync) {
      try {
        flushSync(() => onCommit(value));
      } catch {
        onCommit(value);
      }
    } else {
      onCommit(value);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isUndoKey(event)) {
      event.preventDefault();
      const el = inputRef.current;
      const current = el && "value" in el ? el.value : committedRef.current;
      if (current !== committedRef.current) {
        if (el && "value" in el) el.value = committedRef.current;
        return;
      }
      onUndo();
      return;
    }
    if (isRedoKey(event)) {
      event.preventDefault();
      onRedo();
      return;
    }
    if (columnId === "polaridade" && !event.ctrlKey && !event.metaKey) {
      const letter = event.key.toLowerCase();
      if (letter === "o") {
        event.preventDefault();
        if (inputRef.current) inputRef.current.value = "Ok";
        onCommit("Ok");
        return;
      }
      if (letter === "n") {
        event.preventDefault();
        if (inputRef.current) inputRef.current.value = "Nok";
        onCommit("Nok");
        return;
      }
    }
    const dir = keyMove(event);
    if (!dir) return;
    event.preventDefault();
    flush(true);
    onNavigate(dir);
  };

  const bindField = {
    onPointerDown: () => onActivate(),
    onFocus: () => onActivate(),
    onBlur: () => flush(true),
    onKeyDown,
  };

  const className = [
    active ? "active-cell" : "",
    columnId === "mesa" ? `mesa band-${band}${first ? "" : " muted"}` : "",
    columnId === "secaoCondutor" ? "secao" : "",
  ].filter(Boolean).join(" ") || undefined;

  if (columnId === "isolamentoCorrigido") {
    return (
      <td className={[className, "computed"].filter(Boolean).join(" ")}>
        <input
          ref={(el) => {
            inputRef.current = el;
          }}
          type="text"
          readOnly
          data-sheet-cell="1"
          data-sheet-pos={pos}
          aria-label={columnId}
          value={committed}
          onFocus={() => onActivate()}
          onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  if (columnId === "secaoCondutor") {
    const options = committed && !(CONDUCTOR_SECTIONS as readonly string[]).includes(committed)
      ? [committed, ...CONDUCTOR_SECTIONS]
      : [...CONDUCTOR_SECTIONS];
    return (
      <td className={className}>
        <select
          ref={(el) => {
            inputRef.current = el;
          }}
          data-sheet-cell="1"
          data-sheet-pos={pos}
          aria-label={columnId}
          defaultValue={committed}
          onChange={(event) => onCommit(event.target.value)}
          {...bindField}
        >
          <option value="" />
          {options.map((size) => (
            <option key={size} value={size}>{`${size} mm²`}</option>
          ))}
        </select>
      </td>
    );
  }

  if (columnId === "polaridade") {
    return (
      <td className={className}>
        <select
          ref={(el) => {
            inputRef.current = el;
          }}
          data-sheet-cell="1"
          data-sheet-pos={pos}
          aria-label={columnId}
          defaultValue={committed}
          onChange={(event) => onCommit(event.target.value)}
          {...bindField}
        >
          <option value="" />
          <option value="Ok">Ok</option>
          <option value="Nok">Nok</option>
        </select>
      </td>
    );
  }

  return (
    <td className={className}>
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        type="text"
        data-sheet-cell="1"
        data-sheet-pos={pos}
        aria-label={columnId}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        defaultValue={committed}
        {...bindField}
      />
    </td>
  );
}

export default memo(SheetGrid);
