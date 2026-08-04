export interface RuntimeMetrics {
  readonly ticksExecuted: number;
  readonly entityCount: number;
  readonly systemCount: number;
  readonly scheduledTasks: number;
  readonly saveCount: number;
  readonly errorCount: number;
  readonly diagnosticCount: number;
}

type MetricKey = keyof RuntimeMetrics;

export class MetricsCollector {
  readonly #values: Record<MetricKey, number> = {
    ticksExecuted: 0,
    entityCount: 0,
    systemCount: 0,
    scheduledTasks: 0,
    saveCount: 0,
    errorCount: 0,
    diagnosticCount: 0,
  };

  record(key: MetricKey, value: number): void {
    this.#values[key] = value;
  }

  increment(key: MetricKey): void {
    this.#values[key] += 1;
  }

  get(): RuntimeMetrics {
    return { ...this.#values };
  }

  reset(): void {
    for (const key of Object.keys(this.#values) as MetricKey[]) {
      this.#values[key] = 0;
    }
  }
}
