export type LanguageCode = string;

export interface TranslationEntry {
  readonly key: string;
  readonly value: string;
}

export interface TranslationFile {
  readonly language: LanguageCode;
  readonly namespace: string;
  readonly entries: Record<string, string>;
}
