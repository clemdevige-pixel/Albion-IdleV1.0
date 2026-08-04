export interface PresentationCommand<TPayload = unknown> {
  readonly id: string;
  readonly kind: string;
  readonly payload: TPayload;
  readonly enqueuedAt: number;
}

/**
 * FIFO queue dedicated to visual commands.
 *
 * It deliberately knows nothing about gameplay or Phaser. Commands can be
 * cancelled before presentation without changing the authoritative game state.
 */
export class PresentationQueue {
  private readonly commands: PresentationCommand[] = [];
  private readonly knownIds = new Set<string>();

  public enqueue(command: PresentationCommand): boolean {
    if (this.knownIds.has(command.id)) {
      return false;
    }

    this.commands.push(command);
    this.knownIds.add(command.id);
    return true;
  }

  public dequeue(): PresentationCommand | undefined {
    const command = this.commands.shift();
    if (command !== undefined) {
      this.knownIds.delete(command.id);
    }
    return command;
  }

  public cancel(id: string): boolean {
    const index = this.commands.findIndex((command) => command.id === id);
    if (index < 0) {
      return false;
    }

    this.commands.splice(index, 1);
    this.knownIds.delete(id);
    return true;
  }

  public clear(): void {
    this.commands.length = 0;
    this.knownIds.clear();
  }

  public get size(): number {
    return this.commands.length;
  }
}
