import {
  useLayoutEffect,
  useRef,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type KeyboardEventHandler,
} from "react";
import { flushSync } from "react-dom";
import { installTypingGuard, isEditing } from "./ensureTyping";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  sanitize?: (value: string) => string;
};

installTypingGuard();

/**
 * Uncontrolled while focused. Electron + React `value={...}` was swallowing
 * every keystroke (header, sheet, instruments, inverter editor). The DOM keeps
 * the text; we copy it into the workbook on input/blur/Enter.
 */
export default function FieldInput({
  value,
  onChange,
  sanitize,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: Props) {
  const node = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;

  const apply = (raw: string, sync: boolean) => {
    const el = node.current;
    const next = sanitizeRef.current ? sanitizeRef.current(raw) : raw;
    if (el && el.value !== next) {
      const caret = el.selectionStart ?? next.length;
      el.value = next;
      try {
        el.setSelectionRange(Math.min(caret, next.length), Math.min(caret, next.length));
      } catch {
        /* ignore */
      }
    }
    if (next === valueRef.current) return;
    if (sync) {
      try {
        flushSync(() => onChangeRef.current(next));
      } catch {
        onChangeRef.current(next);
      }
    } else {
      onChangeRef.current(next);
    }
  };

  useLayoutEffect(() => {
    const el = node.current;
    if (!el || isEditing(el)) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
    onFocus?.(event);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    apply(event.target.value, true);
    onBlur?.(event);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    onKeyDown?.(event);
  };

  return (
    <input
      {...props}
      ref={node}
      defaultValue={value}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onFocus={handleFocus}
      onInput={(event) => apply(event.currentTarget.value, false)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
