export interface RuntimeDiagnostic {
  readonly severity: "warning" | "error" | "fatal";
  readonly code: string;
  readonly message: string;
  readonly service?: string;
  readonly tick?: number;
  readonly context?: Record<string, unknown>;
}

export class DiagnosticsCollector {
  readonly #diagnostics: RuntimeDiagnostic[] = [];

  add(diagnostic: RuntimeDiagnostic): void {
    this.#diagnostics.push(diagnostic);
  }

  getAll(): readonly RuntimeDiagnostic[] {
    return this.#diagnostics;
  }

  clear(): void {
    this.#diagnostics.length = 0;
  }

  hasFatal(): boolean {
    return this.#diagnostics.some((d) => d.severity === "fatal");
  }
}
