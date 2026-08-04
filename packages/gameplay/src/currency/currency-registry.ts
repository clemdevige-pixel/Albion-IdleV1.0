import {
  type CurrencyDefinitionLike,
  type CurrencyResult,
  currencyOk,
  currencyFail,
} from "./types.js";

/**
 * Immutable registry of currency definitions (39_CURRENCY_DATA "Runtime
 * Lifecycle": load, validate, register; definitions remain immutable).
 */
export class CurrencyRegistry {
  private readonly definitions = new Map<string, CurrencyDefinitionLike>();

  register(definition: CurrencyDefinitionLike): CurrencyResult<CurrencyDefinitionLike> {
    if (definition.id.length === 0) {
      return currencyFail("invalid_definition");
    }
    if (this.definitions.has(definition.id)) {
      return currencyFail("duplicate_currency");
    }
    if (!Number.isSafeInteger(definition.minValue) || definition.minValue !== 0) {
      return currencyFail("invalid_definition");
    }
    if (
      definition.maxValue !== null &&
      (!Number.isSafeInteger(definition.maxValue) || definition.maxValue < definition.minValue)
    ) {
      return currencyFail("invalid_definition");
    }
    const copy: {
      id: string;
      enabled: boolean;
      minValue: number;
      maxValue: number | null;
      acquisitionSources?: readonly string[];
      spendingSources?: readonly string[];
    } = {
      id: definition.id,
      enabled: definition.enabled,
      minValue: definition.minValue,
      maxValue: definition.maxValue,
    };
    if (definition.acquisitionSources !== undefined) {
      copy.acquisitionSources = Object.freeze([...definition.acquisitionSources]);
    }
    if (definition.spendingSources !== undefined) {
      copy.spendingSources = Object.freeze([...definition.spendingSources]);
    }
    const frozen: CurrencyDefinitionLike = Object.freeze(copy);
    this.definitions.set(frozen.id, frozen);
    return currencyOk(frozen);
  }

  has(currencyId: string): boolean {
    return this.definitions.has(currencyId);
  }

  get(currencyId: string): CurrencyDefinitionLike | undefined {
    return this.definitions.get(currencyId);
  }

  getAll(): readonly CurrencyDefinitionLike[] {
    return [...this.definitions.values()];
  }
}
