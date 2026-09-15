import {
  useEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type KeyboardEventHandler,
} from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Controlled from local state while focused. The workbook only updates on blur
 * (or Enter), so a parent re-render cannot wipe the keystroke — the 1.3.x
 * Electron bug.
 */
export default function FieldInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: Props) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const committed = useRef(value);
  committed.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (focused.current) return;
    setText(value);
  }, [value]);

  const commit = (next: string) => {
    setText(next);
    if (next !== committed.current) onChangeRef.current(next);
  };

  const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
    focused.current = true;
    onFocus?.(event);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    focused.current = false;
    commit(event.target.value);
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
      value={text}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onFocus={handleFocus}
      onChange={(event) => setText(event.target.value)}
      onInput={(event) => setText(event.currentTarget.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
