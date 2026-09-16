import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { isFirstOfMesa, mesaColorBand, propagateIsolation } from "./workbook";
import { CONDUCTOR_SECTIONS, rowValue, type ColumnId, type DisplayColumnId } from "./columns";
import { isRedoKey, isUndoKey, keyMove, moveCell, type CellPos } from "./sheetKeys";
import type { Polaridade, TestRow } from "./types";
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

  useLayoutEffect(() => {
    if (rows.length > prevLen.current) {
      setActive({ row: prevLen.current, col: 0 });
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

  const go = useCallback((dir: NonNullable<ReturnType<typeof keyMove>>) => {
    setActive((pos) => moveCell(pos, dir, rows.length, columns.length));
  }, [rows.length, columns.length]);

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
  columnId,
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
  const [text, setText] = useState(committed);
  const committedRef = useRef(committed);
  committedRef.current = committed;
  const textRef = useRef(text);
  textRef.current = text;
  const focusedRef = useRef(false);
  const wasActive = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (focusedRef.current) return;
    if (document.activeElement === inputRef.current) return;
    setText(committed);
  }, [committed]);

  useLayoutEffect(() => {
    const becameActive = active && !wasActive.current;
    wasActive.current = active;
    if (!becameActive) return;
    const el = inputRef.current;
    if (!el || document.activeElement === el) return;
    el.focus();
  }, [active]);

  const flush = () => {
    const el = inputRef.current;
    const value = el && "value" in el ? el.value : textRef.current;
    textRef.current = value;
    setText(value);
    if (value !== committedRef.current) onCommit(value);
  };

  const remember = (value: string) => {
    textRef.current = value;
    setText(value);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (isUndoKey(event)) {
      event.preventDefault();
      if (textRef.current !== committedRef.current) {
        remember(committedRef.current);
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
        remember("Ok");
        onCommit("Ok");
        return;
      }
      if (letter === "n") {
        event.preventDefault();
        remember("Nok");
        onCommit("Nok");
        return;
      }
    }
    const dir = keyMove(event);
    if (!dir) return;
    event.preventDefault();
    flush();
    onNavigate(dir);
  };

  const className = [
    active ? "active-cell" : "",
    columnId === "mesa" ? `mesa band-${band}${first ? "" : " muted"}` : "",
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
          aria-label={columnId}
          value={committed}
          onFocus={() => {
            focusedRef.current = true;
            onActivate();
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onKeyDown={onKeyDown}
        />
      </td>
    );
  }

  if (columnId === "secaoCondutor") {
    const options = text && !(CONDUCTOR_SECTIONS as readonly string[]).includes(text)
      ? [text, ...CONDUCTOR_SECTIONS]
      : [...CONDUCTOR_SECTIONS];
    return (
      <td className={className}>
        <select
          ref={(el) => {
            inputRef.current = el;
          }}
          data-sheet-cell="1"
          aria-label={columnId}
          value={text}
          onFocus={() => {
            focusedRef.current = true;
            onActivate();
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onChange={(event) => {
            const value = event.target.value;
            remember(value);
            onCommit(value);
          }}
          onKeyDown={onKeyDown}
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
          aria-label={columnId}
          value={text}
          onFocus={() => {
            focusedRef.current = true;
            onActivate();
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onChange={(event) => {
            const value = event.target.value as Polaridade;
            remember(value);
            onCommit(value);
          }}
          onKeyDown={onKeyDown}
        >
          <option value="" />
          <option value="Ok">Ok</option>
          <option value="Nok">Nok</option>
        </select>
      </td>
    );
  }

  return (
    <td className={className} onMouseDown={onActivate}>
      <input
        ref={(el) => {
          inputRef.current = el;
        }}
        type="text"
        data-sheet-cell="1"
        aria-label={columnId}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={text}
        onFocus={() => {
          focusedRef.current = true;
          onActivate();
        }}
        onChange={(event) => remember(event.target.value)}
        onInput={(event) => remember((event.target as HTMLInputElement).value)}
        onBlur={() => {
          focusedRef.current = false;
          flush();
        }}
        onKeyDown={onKeyDown}
      />
    </td>
  );
}

export default memo(SheetGrid);
