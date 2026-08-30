"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DarkSelectOption = { value: string; label: string };

const fieldClass =
  "w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2.5 text-sm text-white placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function darkFieldClass() {
  return fieldClass;
}

export function DarkSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: DarkSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-1 block text-sm text-stone-200">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${fieldClass} flex items-center justify-between text-right disabled:opacity-50`}
      >
        <span className={selected ? "text-white" : "text-stone-400"}>
          {selected?.label ?? placeholder ?? "— اختر —"}
        </span>
        <span className="text-stone-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-600 bg-stone-900 py-1 shadow-xl"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-right text-sm transition ${
                    active
                      ? "bg-amber-600/30 text-amber-100"
                      : "text-white hover:bg-stone-800 focus:bg-stone-800"
                  }`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DarkSegment({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: DarkSelectOption[];
}) {
  return (
    <div>
      <span className="mb-1 block text-sm text-stone-200">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              value === o.value
                ? "border-amber-500 bg-amber-600/25 text-amber-100"
                : "border-stone-600 bg-stone-900 text-white hover:border-stone-500"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
