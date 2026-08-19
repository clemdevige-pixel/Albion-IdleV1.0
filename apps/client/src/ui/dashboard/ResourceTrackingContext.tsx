import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface TrackedResource {
  readonly itemId: string;
  readonly label: string;
  readonly iconSrc: string;
}

interface ResourceTrackingState {
  readonly resources: readonly TrackedResource[];
  readonly isTracked: (itemId: string) => boolean;
  readonly toggleTracked: (resource: TrackedResource) => void;
  readonly untrack: (itemId: string) => void;
}

const ResourceTrackingContext = createContext<ResourceTrackingState | null>(null);

export function ResourceTrackingProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [resources, setResources] = useState<readonly TrackedResource[]>([]);

  const isTracked = useCallback(
    (itemId: string) => resources.some((resource) => resource.itemId === itemId),
    [resources],
  );

  const toggleTracked = useCallback((resource: TrackedResource) => {
    setResources((current) => current.some((entry) => entry.itemId === resource.itemId)
      ? current.filter((entry) => entry.itemId !== resource.itemId)
      : [...current, resource]);
  }, []);

  const untrack = useCallback((itemId: string) => {
    setResources((current) => current.filter((entry) => entry.itemId !== itemId));
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
