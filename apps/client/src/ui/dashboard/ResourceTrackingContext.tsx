import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TrackedResourceSource = "player" | "production";

export interface TrackedResourceEntry {
  readonly itemId: string;
  readonly label: string;
  readonly source: TrackedResourceSource;
}

export interface TrackedResource {
  /** Stable tracking identity. A single item can use its itemId; aggregate rows use a semantic id. */
  readonly id: string;
  readonly label: string;
  readonly entries: readonly TrackedResourceEntry[];
}

interface ResourceTrackingState {
  readonly resources: readonly TrackedResource[];
  readonly selectedResource: TrackedResource | undefined;
  readonly isTracked: (id: string) => boolean;
  readonly toggleTracked: (resource: TrackedResource) => void;
  readonly untrack: (id: string) => void;
}

const RESOURCE_TRACKING_STORAGE_KEY = "albion-idle:tracked-resources:v1";
const ResourceTrackingContext = createContext<ResourceTrackingState | null>(null);

/**
 * Generic resource contract used by UI tracking surfaces.
 * No resource family is whitelisted here: current and future resource items
 * participate automatically through the shared resource item-id conventions.
 */
export function isTrackableResourceItem(itemId: string): boolean {
  return itemId.startsWith("item_resource_") || itemId.startsWith("item_refined_");
}

export function createTrackedItemResource(itemId: string, label: string): TrackedResource {
  return {
    id: itemId,
    label,
    entries: [{ itemId, label, source: "player" }],
  };
}

function isTrackedResourceEntry(value: unknown): value is TrackedResourceEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TrackedResourceEntry>;
  return typeof candidate.itemId === "string"
    && typeof candidate.label === "string"
    && (candidate.source === "player" || candidate.source === "production");
}

function isTrackedResource(value: unknown): value is TrackedResource {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TrackedResource>;
  return typeof candidate.id === "string"
    && typeof candidate.label === "string"
    && Array.isArray(candidate.entries)
    && candidate.entries.every(isTrackedResourceEntry);
}

function loadPersistedResources(): readonly TrackedResource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESOURCE_TRACKING_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const first = parsed.find(isTrackedResource);
    return first === undefined ? [] : [first];
  } catch {
    return [];
  }
}

export function ResourceTrackingProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [resources, setResources] = useState<readonly TrackedResource[]>(loadPersistedResources);

  useEffect(() => {
    try {
      window.localStorage.setItem(RESOURCE_TRACKING_STORAGE_KEY, JSON.stringify(resources));
    } catch {
      // UI preferences must never block the game if browser storage is unavailable.
    }
  }, [resources]);

  const isTracked = useCallback(
    (id: string) => resources[0]?.id === id,
    [resources],
  );

  const toggleTracked = useCallback((resource: TrackedResource) => {
    setResources((current) => current[0]?.id === resource.id ? [] : [resource]);
  }, []);

  const untrack = useCallback((id: string) => {
    setResources((current) => current[0]?.id === id ? [] : current);
  }, []);

  const value = useMemo<ResourceTrackingState>(() => ({
    resources,
    selectedResource: resources[0],
    isTracked,
    toggleTracked,
    untrack,
  }), [resources, isTracked, toggleTracked, untrack]);

  return (
    <ResourceTrackingContext.Provider value={value}>
      {children}
    </ResourceTrackingContext.Provider>
  );
}

export function useResourceTracking(): ResourceTrackingState {
  const context = useContext(ResourceTrackingContext);
  if (context === null) {
    throw new Error("useResourceTracking must be used within ResourceTrackingProvider");
  }
  return context;
}
