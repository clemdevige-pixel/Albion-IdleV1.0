interface PresentedEnemyHealthState {
  current: number;
  maximum: number;
  initialized: boolean;
}

const enemyHealth: PresentedEnemyHealthState = {
  current: 0,
  maximum: 0,
  initialized: false,
};

export function resetPresentedEnemyHealth(current: number, maximum: number): void {
  enemyHealth.current = current;
  enemyHealth.maximum = maximum;
  enemyHealth.initialized = true;
}

export function applyPresentedEnemyImpact(targetHealthAfter: number): void {
  if (!enemyHealth.initialized) return;
  enemyHealth.current = Math.max(0, Math.min(enemyHealth.maximum, targetHealthAfter));
}

export function getPresentedEnemyHealth(
  fallbackCurrent: number,
  fallbackMaximum: number,
): { readonly current: number; readonly maximum: number } {
  if (!enemyHealth.initialized) {
    return { current: fallbackCurrent, maximum: fallbackMaximum };
  }
  return { current: enemyHealth.current, maximum: enemyHealth.maximum };
}

export function clearPresentedEnemyHealth(): void {
  enemyHealth.current = 0;
  enemyHealth.maximum = 0;
  enemyHealth.initialized = false;
}
