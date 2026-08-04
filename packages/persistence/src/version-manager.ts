export class VersionManager {
  constructor(readonly currentVersion: number) {}

  isOld(version: number): boolean {
    return version < this.currentVersion;
  }

  isCurrent(version: number): boolean {
    return version === this.currentVersion;
  }

  isFuture(version: number): boolean {
    return version > this.currentVersion;
  }
}
