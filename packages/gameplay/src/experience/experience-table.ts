/**
 * Data-driven XP table (28_EXPERIENCE_SYSTEM).
 *
 * Constructed from the `experiencePerLevel` array in mastery definitions.
 * Index 0 = XP required to go from level 0 to level 1.
 */
export class ExperienceTable {
  private readonly requirements: readonly number[];

  constructor(requirements: readonly number[]) {
    if (requirements.length === 0) {
      throw new Error("ExperienceTable requires at least one entry");
    }
    this.requirements = requirements;
  }

  /** XP needed to advance from `level` to `level + 1`. Beyond the array, uses the last entry. */
  getRequiredXp(level: number): number {
    if (level < 0) {
      return this.requirements[0] as number;
    }
    if (level >= this.requirements.length) {
      return this.requirements[this.requirements.length - 1] as number;
    }
    return this.requirements[level] as number;
  }

  /** Compute level and remaining XP from cumulative totalXp. */
  getLevel(totalXp: number, maxLevel: number): { level: number; remainingXp: number } {
    let remaining = totalXp;
    let level = 0;
    while (level < maxLevel) {
      const needed = this.getRequiredXp(level);
      if (remaining < needed) {
        break;
      }
      remaining -= needed;
      level += 1;
    }
    return { level, remainingXp: remaining };
  }

  /** Number of entries in the table. */
  getMaxLevel(): number {
    return this.requirements.length;
  }
}
