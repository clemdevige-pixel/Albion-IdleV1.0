type DevSandboxPostLoadAdjustment = () => void;

let currentAdjustment: DevSandboxPostLoadAdjustment | undefined;

/**
 * Dev-only runtime hook used when authored sandbox state must override values
 * restored from the persistent dev save slot. One GameProvider owns the active
 * runtime at a time, so the latest assembled foundation is authoritative.
 */
export function registerDevSandboxPostLoadAdjustment(
  adjustment: DevSandboxPostLoadAdjustment,
): void {
  currentAdjustment = adjustment;
}

export function runDevSandboxPostLoadAdjustment(): void {
  currentAdjustment?.();
}
