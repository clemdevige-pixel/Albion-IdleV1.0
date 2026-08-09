import type { UiModuleId } from "../navigation/moduleIds";

/** Metadata only. Module rendering stays owned by each feature folder. */
export interface UiModuleDefinition {
  readonly id: UiModuleId;
  readonly label: string;
  readonly icon?: string;
}
