import type { RuntimeDiagnostic } from "./diagnostics.js";

export interface RuntimeFailure {
  readonly message: string;
  readonly tick: number;
  readonly system?: string;
  readonly cause?: Error | undefined;
}

export type RuntimeHealth =
  | { readonly status: "healthy" }
  | { readonly status: "degraded"; readonly issues: readonly RuntimeDiagnostic[] }
  | { readonly status: "failed"; readonly error: RuntimeFailure };
