export class RuntimeLifecycle {
  private timerId: number | undefined = undefined;
  private isRunning: boolean = false;

  public start(tickFn: () => void, intervalMs: number = 500): void {
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
