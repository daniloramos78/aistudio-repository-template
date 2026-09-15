import {
  useLayoutEffect,
  useRef,
  type FocusEventHandler,
  type InputHTMLAttributes,
} from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Uncontrolled while focused so Electron/Chromium cannot wipe keystrokes
 * when the parent re-renders (the 1.2.0 sheet-cell bug).
 */
export default function FieldInput({
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (focused.current || document.activeElement === el) return;
    if (el.value !== value) el.value = value;
  }, [value]);

  const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
    focused.current = true;
    onFocus?.(event);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    focused.current = false;
    onChange(event.target.value);
    onBlur?.(event);
  };

  return (
    <input
      {...props}
      ref={ref}
      defaultValue={value}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onFocus={handleFocus}
      onInput={(event) => onChange(event.currentTarget.value)}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={handleBlur}
    />
  );
}
