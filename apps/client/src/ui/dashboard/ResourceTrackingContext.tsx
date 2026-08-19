import {
  createContext,
  useCallback,
  useContext,
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
  readonly isTracked: (id: string) => boolean;
  readonly toggleTracked: (resource: TrackedResource) => void;
  readonly untrack: (id: string) => void;
}

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

export function ResourceTrackingProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [resources, setResources] = useState<readonly TrackedResource[]>([]);

  const isTracked = useCallback(
    (id: string) => resources.some((resource) => resource.id === id),
    [resources],
  );

  const toggleTracked = useCallback((resource: TrackedResource) => {
    setResources((current) => current.some((entry) => entry.id === resource.id)
      ? current.filter((entry) => entry.id !== resource.id)
      : [...current, resource]);
  }, []);

  const untrack = useCallback((id: string) => {
    setResources((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const value = useMemo<ResourceTrackingState>(() => ({
    resources,
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
