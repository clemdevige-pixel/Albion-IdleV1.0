import type { DashboardZoneModel } from "../dashboard/dashboardModels";
import {
  useDashboardZone,
  useDashboardZoneActions,
} from "../dashboard/useDashboardData";

export function useWorldZones(): DashboardZoneModel {
  return useDashboardZone();
}

export function useWorldActions(): {
  readonly travelToSegment: (zoneIndex: number, segmentIndex: number) => boolean;
  readonly setFarmMode: (enabled: boolean) => void;
} {
  const { selectZoneSegment, setFarmMode } = useDashboardZoneActions();
  return { travelToSegment: selectZoneSegment, setFarmMode };
}
