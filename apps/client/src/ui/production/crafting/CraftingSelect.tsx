import { useEffect, useRef, useState } from "react";

export interface CraftingSelectOption {
  readonly value: string;
  readonly label: string;
}

export function CraftingSelect({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly CraftingSelectOption[];
  readonly onChange: (value: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => { document.removeEventListener("mousedown", handlePointerDown); };
  }, [open]);

  return (
    <div className="ui-crafting-select" ref={rootRef}>
      <span className="ui-crafting-select__label">{label}</span>
      <button
        type="button"
        className={`ui-crafting-select__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen((current) => !current); }}
      >
        <span>{selected?.label ?? "—"}</span>
        <b aria-hidden="true">⌄</b>
      </button>

      {open && (
        <div className="ui-crafting-select__menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const active = option.value === selected?.value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={active ? "is-active" : ""}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
