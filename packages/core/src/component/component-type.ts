/**
 * A component type is a typed token identifying one kind of data component.
 *
 * The phantom `TComponent` carries the component's data shape through the API so
 * reads and writes stay strongly typed, while the runtime identity is the `key`.
 */
export interface ComponentType<TComponent> {
  readonly key: string;
  /** Phantom marker; never populated at runtime. */
  readonly __component?: TComponent;
}

/** Extracts the data type carried by a {@link ComponentType}. */
export type ComponentOf<C> = C extends ComponentType<infer T> ? T : never;

/**
 * Defines a component type with a unique `key`.
 *
 * Components are plain data containers; no behaviour lives on them.
 */
export function defineComponent<TComponent>(key: string): ComponentType<TComponent> {
  return { key };
}
