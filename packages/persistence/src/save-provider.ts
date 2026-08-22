export interface SaveProvider {
  readonly providerId: string;
  save(): unknown;
  load(data: unknown): void;
  /** Resolve passive progress from trusted elapsed time after load. */
  resolveBackground?(elapsedMs: number): void;
}
