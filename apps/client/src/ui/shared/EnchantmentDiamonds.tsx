import type { EnchantmentLevel } from "@game/gameplay";

interface EnchantmentDiamondsProps {
  readonly level: EnchantmentLevel;
  readonly variant?: "slot" | "tooltip";
  readonly showLabel?: boolean;
}

const DIAMOND_LEVELS: readonly EnchantmentLevel[] = [1, 2, 3, 4];

export function EnchantmentDiamonds({
  level,
  variant = "slot",
  showLabel = false,
}: EnchantmentDiamondsProps): JSX.Element {
  return (
    <span
      className={`enchantment-diamonds enchantment-diamonds--${variant}`}
      aria-label={`Niveau d'enchantement ${String(level)} sur 4`}
    >
      {showLabel && <span className="enchantment-diamonds__label">Niveau d’enchantement</span>}
      <span className="enchantment-diamonds__row" aria-hidden="true">
        {DIAMOND_LEVELS.map((diamondLevel) => (
          <span
            key={diamondLevel}
            className={`enchantment-diamonds__diamond${diamondLevel <= level ? " enchantment-diamonds__diamond--filled" : ""}`}
          />
        ))}
      </span>
    </span>
  );
}
