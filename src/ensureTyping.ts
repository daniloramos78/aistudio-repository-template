/** True when this control currently owns the caret — never overwrite its DOM value. */
export function isEditing(el: HTMLElement | null | undefined): boolean {
  return Boolean(el && document.activeElement === el);
}

function isTypedField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.readOnly || el.disabled) return false;
  const type = (el.type || "text").toLowerCase();
  return type === "text"
    || type === "search"
    || type === "url"
    || type === "tel"
    || type === "password"
    || type === "email"
    || type === "number"
    || type === "";
}

function notify(el: HTMLInputElement | HTMLTextAreaElement) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertAtCaret(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const caret = start + text.length;
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* number inputs may reject setSelectionRange */
  }
  notify(el);
}

function deleteAtCaret(el: HTMLInputElement | HTMLTextAreaElement, direction: "back" | "forward") {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  let from = start;
  let to = end;
  if (from === to) {
    if (direction === "back") from = Math.max(0, from - 1);
    else to = Math.min(el.value.length, to + 1);
  }
  if (from === to) return;
  el.value = el.value.slice(0, from) + el.value.slice(to);
  try {
    el.setSelectionRange(from, from);
  } catch {
    /* ignore */
  }
  notify(el);
}

/**
 * Electron + React 18 on Windows often never fires `input`/`onChange` on
 * controlled fields, so the character never lands. If the browser did not
 * change the value after a printable key, insert it into the DOM ourselves.
 */
function onKeyDown(event: KeyboardEvent) {
  if (event.isComposing) return;
  const el = event.target;
  if (!isTypedField(el)) return;

  const altGr = event.ctrlKey && event.altKey;
  if ((event.ctrlKey || event.metaKey) && !altGr) return;
  if (event.altKey && !altGr) return;

  const key = event.key;
  const isChar = key.length === 1;
  const isDelete = key === "Backspace" || key === "Delete";
  if (!isChar && !isDelete) return;

  const before = el.value;
  window.setTimeout(() => {
    if (!el.isConnected || document.activeElement !== el) return;
    if (el.value !== before) return;
    if (key === "Backspace") {
      deleteAtCaret(el, "back");
      return;
    }
    if (key === "Delete") {
      deleteAtCaret(el, "forward");
      return;
    }
    insertAtCaret(el, key);
  }, 0);
}

let installed = false;

export function installTypingGuard(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("keydown", onKeyDown, true);
}

/** Test-only. */
export function resetTypingGuardForTests(): void {
  installed = false;
}
