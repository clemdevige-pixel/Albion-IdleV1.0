/** Optional metadata attached to a damage request for traceability. */
export interface DamageContext {
  readonly tick: number;
  readonly combatSessionId?: string | undefined;
}
