import type { LanguageCode, TranslationFile } from "./types.js";

export class TranslationRegistry {
  private readonly translations = new Map<LanguageCode, Map<string, string>>();

  register(file: TranslationFile): void {
    let langMap = this.translations.get(file.language);
    if (!langMap) {
      langMap = new Map<string, string>();
      this.translations.set(file.language, langMap);
    }
    for (const [key, value] of Object.entries(file.entries)) {
      const fullKey = `${file.namespace}.${key}`;
      langMap.set(fullKey, value);
    }
  }

  get(language: LanguageCode, key: string): string | undefined {
    return this.translations.get(language)?.get(key);
  }

  has(language: LanguageCode, key: string): boolean {
    return this.translations.get(language)?.has(key) ?? false;
  }

  getLanguages(): readonly LanguageCode[] {
    return [...this.translations.keys()];
  }

  getKeys(language: LanguageCode): readonly string[] {
    const langMap = this.translations.get(language);
    return langMap ? [...langMap.keys()] : [];
  }

  clear(): void {
    this.translations.clear();
  }
}
