/**
 * Formatted Silver display with optional income rate.
 */
export function CurrencyDisplay({
  amount,
  incomeRate,
  size = "default",
}: {
  readonly amount: number;
  readonly incomeRate?: number;
  readonly size?: "small" | "default" | "large";
}): JSX.Element {
  const formatted = formatSilver(amount);
  const sizeClass = size === "default" ? "" : ` currency--${size}`;

  return (
    <span className={`currency${sizeClass}`}>
      <span className="currency__icon">{"S"}</span>
      <span className="currency__amount">{formatted}</span>
      {incomeRate !== undefined && incomeRate !== 0 && (
        <span className={`currency__rate${incomeRate > 0 ? " currency__rate--positive" : " currency__rate--negative"}`}>
          {incomeRate > 0 ? "+" : ""}{formatSilver(incomeRate)}{"/kill"}
        </span>
      )}
    </span>
  );
}

function formatSilver(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }
  return String(amount);
}
