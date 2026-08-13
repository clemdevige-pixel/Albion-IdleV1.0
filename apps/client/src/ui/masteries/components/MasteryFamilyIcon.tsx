import type { MasteryFamilyModel } from "../masteryModels";

interface MasteryFamilyIconProps {
  readonly family: MasteryFamilyModel;
  readonly className: string;
}

/** Uses a real asset when available while preserving existing weapon symbols. */
export function MasteryFamilyIcon({ family, className }: MasteryFamilyIconProps): JSX.Element {
  return (
    <span className={className} aria-hidden="true">
      {family.iconAsset === undefined
        ? family.icon
        : <img src={family.iconAsset} alt="" />}
    </span>
  );
}
