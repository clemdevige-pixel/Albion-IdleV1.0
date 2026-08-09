import { useGameServices } from "../../../state/GameContext";

export function useRepairActions(): { readonly repairAll: () => boolean } {
  const { repairAll } = useGameServices();
  return { repairAll };
}
