export const DEFAULT_RUNTIME_TICK_INTERVAL_MS = 500;

export class RuntimeLifecycle {
  private timerId: number | undefined = undefined;
  private isRunning: boolean = false;

  public start(
    tickFn: () => void,
    intervalMs: number = DEFAULT_RUNTIME_TICK_INTERVAL_MS,
  ): void {
    this.stop();
    this.timerId = window.setInterval(tickFn, intervalMs);
    this.isRunning = true;
  }

  public stop(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
    this.isRunning = false;
  }

  public get active(): boolean {
    return this.isRunning;
  }
}
