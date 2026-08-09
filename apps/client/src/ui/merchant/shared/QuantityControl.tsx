interface QuantityControlProps {
  readonly label: string;
  readonly value: number;
  readonly maximum: number;
  readonly onChange: (quantity: number) => void;
}

export function QuantityControl({
  label,
  value,
  maximum,
  onChange,
}: QuantityControlProps): JSX.Element {
  const setQuantity = (quantity: number): void => {
    onChange(Math.max(1, Math.min(maximum, Math.floor(quantity))));
  };

  return (
    <div className="ui-merchant-quantity" aria-label={label}>
      <button type="button" onClick={() => { setQuantity(value - 1); }}>−</button>
      <input
        type="number"
        min={1}
        max={maximum}
        value={value}
        aria-label={label}
        onChange={(event) => { setQuantity(Number(event.currentTarget.value)); }}
      />
      <button type="button" onClick={() => { setQuantity(value + 1); }}>+</button>
      <button type="button" className="ui-merchant-quantity__max" onClick={() => { setQuantity(maximum); }}>
        Max
      </button>
    </div>
  );
}
