import { describe, it, expect, beforeEach } from "vitest";
import {
  TranslationRegistry,
  LocalizationManager,
  TranslationValidator,
  TranslationFileSchema,
} from "../index.js";
import type { TranslationFile } from "../index.js";

const enItems: TranslationFile = {
  language: "en",
  namespace: "items",
  entries: {
    "sword.name": "Iron Sword",
    "sword.desc": "A sturdy sword",
    "shield.name": "Wooden Shield",
  },
};

const frItems: TranslationFile = {
  language: "fr",
  namespace: "items",
  entries: {
    "sword.name": "Epee de fer",
    "sword.desc": "Une epee solide",
  },
};

const enMonsters: TranslationFile = {
  language: "en",
  namespace: "monsters",
  entries: {
    "wolf.name": "Dire Wolf",
    "wolf.damage": "Deals {amount} damage",
  },
};

describe("TranslationFileSchema", () => {
  it("validates a correct translation file", () => {
    expect(TranslationFileSchema.parse(enItems)).toEqual(enItems);
  });

  it("rejects invalid language code", () => {
    expect(() => TranslationFileSchema.parse({ language: "x", namespace: "ui", entries: {} })).toThrow();
  });
});

describe("TranslationRegistry", () => {
  let registry: TranslationRegistry;

  beforeEach(() => {
    registry = new TranslationRegistry();
  });

  it("registers and retrieves translations", () => {
    registry.register(enItems);
    expect(registry.get("en", "items.sword.name")).toBe("Iron Sword");
  });

  it("returns undefined for missing key", () => {
    registry.register(enItems);
    expect(registry.get("en", "items.missing")).toBeUndefined();
  });

  it("has() returns correct boolean", () => {
    registry.register(enItems);
    expect(registry.has("en", "items.sword.name")).toBe(true);
    expect(registry.has("en", "items.missing")).toBe(false);
    expect(registry.has("de", "items.sword.name")).toBe(false);
  });

  it("getLanguages returns registered languages", () => {
    registry.register(enItems);
    registry.register(frItems);
    expect(registry.getLanguages()).toContain("en");
    expect(registry.getLanguages()).toContain("fr");
  });

  it("getKeys returns all keys for a language", () => {
    registry.register(enItems);
    const keys = registry.getKeys("en");
    expect(keys).toContain("items.sword.name");
    expect(keys).toContain("items.shield.name");
  });

  it("clear removes all translations", () => {
    registry.register(enItems);
    registry.clear();
    expect(registry.get("en", "items.sword.name")).toBeUndefined();
    expect(registry.getLanguages()).toHaveLength(0);
  });

  it("multiple namespaces work correctly", () => {
    registry.register(enItems);
    registry.register(enMonsters);
    expect(registry.get("en", "items.sword.name")).toBe("Iron Sword");
    expect(registry.get("en", "monsters.wolf.name")).toBe("Dire Wolf");
  });
});

describe("LocalizationManager", () => {
  let registry: TranslationRegistry;

  beforeEach(() => {
    registry = new TranslationRegistry();
    registry.register(enItems);
    registry.register(frItems);
    registry.register(enMonsters);
  });

  it("translates with current language", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "en" });
    expect(mgr.t("items.sword.name")).toBe("Iron Sword");
  });

  it("falls back to fallback language when key missing in current", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "fr", fallbackLanguage: "en" });
    expect(mgr.t("items.shield.name")).toBe("Wooden Shield");
  });

  it("falls back to key itself when missing everywhere", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "fr", fallbackLanguage: "en" });
    expect(mgr.t("items.nonexistent")).toBe("items.nonexistent");
  });

  it("interpolates variables", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "en" });
    expect(mgr.t("monsters.wolf.damage", { amount: 50 })).toBe("Deals 50 damage");
  });

  it("changes language at runtime", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "en" });
    expect(mgr.t("items.sword.name")).toBe("Iron Sword");
    mgr.setLanguage("fr");
    expect(mgr.getLanguage()).toBe("fr");
    expect(mgr.t("items.sword.name")).toBe("Epee de fer");
  });

  it("getAvailableLanguages returns registered languages", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "en" });
    const langs = mgr.getAvailableLanguages();
    expect(langs).toContain("en");
    expect(langs).toContain("fr");
  });

  it("has() checks current and fallback", () => {
    const mgr = new LocalizationManager({ registry, defaultLanguage: "fr", fallbackLanguage: "en" });
    expect(mgr.has("items.sword.name")).toBe(true);
    expect(mgr.has("items.shield.name")).toBe(true); // only in en (fallback)
    expect(mgr.has("items.nonexistent")).toBe(false);
  });

  it("empty registry returns key as fallback", () => {
    const emptyRegistry = new TranslationRegistry();
    const mgr = new LocalizationManager({ registry: emptyRegistry, defaultLanguage: "en" });
    expect(mgr.t("some.key")).toBe("some.key");
  });
});

describe("TranslationValidator", () => {
  const validator = new TranslationValidator();

  it("detects duplicate keys", () => {
    const dup1: TranslationFile = { language: "en", namespace: "ui", entries: { ok: "OK" } };
    const dup2: TranslationFile = { language: "en", namespace: "ui", entries: { ok: "Okay" } };
    const issues = validator.validate([dup1, dup2]);
    expect(issues.some((i) => i.code === "DATA_DUPLICATE_ID")).toBe(true);
  });

  it("detects empty values", () => {
    const file: TranslationFile = { language: "en", namespace: "ui", entries: { ok: "" } };
    const issues = validator.validate([file]);
    expect(issues.some((i) => i.code === "DATA_SCHEMA_INVALID")).toBe(true);
  });

  it("detects missing keys vs reference language", () => {
    const issues = validator.validate([enItems, frItems]);
    expect(issues.some((i) => i.code === "DATA_UNKNOWN_REFERENCE" && i.message.includes("shield.name"))).toBe(true);
  });

  it("returns no issues for valid files", () => {
    const en: TranslationFile = { language: "en", namespace: "ui", entries: { ok: "OK" } };
    const fr: TranslationFile = { language: "fr", namespace: "ui", entries: { ok: "OK" } };
    const issues = validator.validate([en, fr]);
    expect(issues).toHaveLength(0);
  });
});
