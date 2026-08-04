export interface SaveProvider {
  readonly providerId: string;
  save(): unknown;
  load(data: unknown): void;
}
