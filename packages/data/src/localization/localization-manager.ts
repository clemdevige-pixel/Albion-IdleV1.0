import type { LanguageCode } from "./types.js";
import type { TranslationRegistry } from "./translation-registry.js";

export interface LocalizationManagerOptions {
  readonly registry: TranslationRegistry;
  readonly defaultLanguage: LanguageCode;
  readonly fallbackLanguage?: LanguageCode;
}

export class LocalizationManager {
  private readonly registry: TranslationRegistry;
  private currentLanguage: LanguageCode;
  private readonly fallbackLanguage: LanguageCode | undefined;

  constructor(options: LocalizationManagerOptions) {
    this.registry = options.registry;
    this.currentLanguage = options.defaultLanguage;
    this.fallbackLanguage = options.fallbackLanguage;
  }

  getLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  setLanguage(lang: LanguageCode): void {
    this.currentLanguage = lang;
  }

  t(key: string, vars?: Record<string, string | number>): string {
    let value =
      this.registry.get(this.currentLanguage, key) ??
      (this.fallbackLanguage ? this.registry.get(this.fallbackLanguage, key) : undefined) ??
      key;

    if (vars) {
      for (const [name, val] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(val));
      }
    }

    return value;
  }

  has(key: string): boolean {
    return (
      this.registry.has(this.currentLanguage, key) ||
      (this.fallbackLanguage !== undefined && this.registry.has(this.fallbackLanguage, key))
    );
  }

  getAvailableLanguages(): readonly LanguageCode[] {
    return this.registry.getLanguages();
  }
}
