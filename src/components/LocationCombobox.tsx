import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { filterLabels, labelsMatch } from "../lib/labels";

interface Props {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

const LIST_MAX = 220;

interface Box {
  left: number;
  width: number;
  top: number;
  maxHeight: number;
}

export function LocationCombobox({ value, options, onChange, ariaLabel }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const editing = draft !== null;
  const text = draft ?? value;

  // Browse the whole list until the operator narrows it by typing.
  const filtered = useMemo(() => (editing ? filterLabels(options, text) : options), [editing, options, text]);
  const trimmed = text.trim();
  const showCustom = trimmed !== "" && !filtered.some((o) => labelsMatch(o, trimmed));
  const items = showCustom ? [...filtered, trimmed] : filtered;

  // The table panes clip overflow, so the list is drawn in a portal at fixed coordinates.
  const measure = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const flip = below < Math.min(LIST_MAX, 120) && above > below;
    setBox({
      left: r.left,
      width: Math.max(r.width, 160),
      top: flip ? Math.max(8, r.top - Math.min(LIST_MAX, above)) : r.bottom + 4,
      maxHeight: Math.min(LIST_MAX, flip ? above : below),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (inputRef.current?.parentElement?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  function commit(next: string) {
    setDraft(null);
    setOpen(false);
    setActive(-1);
    if (next.trim() !== value.trim()) onChange(next);
  }

  function revert() {
    setDraft(null);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((i) => (items.length === 0 ? -1 : (i + 1) % items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length === 0 ? -1 : (i <= 0 ? items.length : i) - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(open && active >= 0 && items[active] ? items[active] : text);
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert();
    } else if (e.key === "Tab") {
      commit(text);
    }
  }

  const list =
    open && box ? (
      <ul
        ref={listRef}
        className="combo-list"
        role="listbox"
        style={{ left: box.left, top: box.top, width: box.width, maxHeight: box.maxHeight }}
      >
        {filtered.map((opt, i) => (
          <li key={opt}>
            <button
              type="button"
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(opt)}
            >
              {opt}
            </button>
          </li>
        ))}
        {showCustom ? (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={active === filtered.length}
              className={active === filtered.length ? "on" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(trimmed)}
            >
              Use “{trimmed}”
            </button>
          </li>
        ) : null}
        {value.trim() !== "" ? (
          <li>
            <button
              type="button"
              className="combo-clear"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit("")}
            >
              Clear location
            </button>
          </li>
        ) : null}
        {items.length === 0 && value.trim() === "" ? <li className="combo-empty">No saved points</li> : null}
      </ul>
    ) : null;

  return (
    <div className="combo">
      <input
        ref={inputRef}
        className="field loc-input"
        value={text}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        placeholder="Search or type"
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => {
          setOpen(true);
          setActive(-1);
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onBlur={(e) => {
          if (listRef.current?.contains(e.relatedTarget as Node | null)) return;
          commit(text);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="combo-toggle"
        tabIndex={-1}
        aria-label={`${open ? "Hide" : "Show"} location list`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          setActive(-1);
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <span className="caret" />
      </button>
      {list ? createPortal(list, document.body) : null}
    </div>
  );
}
