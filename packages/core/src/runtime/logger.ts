export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly error?: Error;
  readonly tick?: number;
  readonly service?: string;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>, error?: Error): void;
}

export function createSilentLogger(): Logger {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}

export class MemoryLogger implements Logger {
  readonly #entries: LogEntry[] = [];
  readonly #tick: () => number;
  readonly #service: string | undefined;

  constructor(options: { tick?: () => number; service?: string } = {}) {
    this.#tick = options.tick ?? (() => 0);
    this.#service = options.service;
  }

  get entries(): readonly LogEntry[] {
    return this.#entries;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.#log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.#log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.#log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.#log("error", message, context, error);
  }

  clear(): void {
    this.#entries.length = 0;
  }

  #log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    this.#entries.push({
      level,
      message,
      ...(context !== undefined ? { context } : {}),
      ...(error !== undefined ? { error } : {}),
      tick: this.#tick(),
      ...(this.#service !== undefined ? { service: this.#service } : {}),
    });
  }
}

export function createMemoryLogger(options: { tick?: () => number; service?: string } = {}): MemoryLogger {
  return new MemoryLogger(options);
}

export function createConsoleLogger(options: { tick?: () => number; service?: string } = {}): Logger {
  const tick = options.tick ?? (() => 0);
  const service = options.service;

  function format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const parts = [`[${level.toUpperCase()}]`, `tick=${tick()}`];
    if (service !== undefined) {
      parts.push(`service=${service}`);
    }
    parts.push(message);
    if (context !== undefined) {
      parts.push(JSON.stringify(context));
    }
    return parts.join(" ");
  }

  return {
    debug(message, context) {
      console.debug(format("debug", message, context));
    },
    info(message, context) {
      console.info(format("info", message, context));
    },
    warn(message, context) {
      console.warn(format("warn", message, context));
    },
    error(message, context, error) {
      console.error(format("error", message, context));
      if (error !== undefined) {
        console.error(error);
      }
    },
  };
}
