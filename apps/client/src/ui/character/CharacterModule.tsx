import { ContextHoverTooltip } from "../shared/ContextHoverTooltip";
import { AwakenedWeaponPanel } from "./components/AwakenedWeaponPanel";
import { CharacterEquipmentPanel } from "./components/CharacterEquipmentPanel";
import { useCharacterData } from "./useCharacterData";
import "./character.css";

function formatValue(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatWholeValue(value: number): string {
  return Math.round(value).toLocaleString("fr-FR");
}

export function CharacterModule(): JSX.Element {
  const character = useCharacterData();

  return (
    <div className="character-module">
      <CharacterEquipmentPanel />

      <section className="character-module__stats" aria-label="Statistiques de combat">
        <article className="character-module__stat-card character-module__stat-card--ip">
          <img src="/assets/ui/ip.png" alt="" aria-hidden="true" draggable={false} />
          <div>
            <ContextHoverTooltip
              tooltip={(
                <div className="context-tooltip-content">
                  <div className="context-tooltip-content__header"><strong>Item Power</strong></div>
                  <div className="context-tooltip-content__body">Représente la puissance globale fournie par ton équipement.</div>
                </div>
              )}
            >
              <span>Item Power</span>
            </ContextHoverTooltip>
            <strong>{formatValue(character.itemPower)}</strong>
          </div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/health.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Points de vie</span><strong>{formatWholeValue(character.stats.health)} / {formatWholeValue(character.stats.maxHealth)}</strong></div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/damage.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Dégâts</span><div className="character-module__stat-values"><span><small>Phys.</small><strong>{formatValue(character.stats.physicalDamage)}</strong></span><span><small>Mag.</small><strong>{formatValue(character.stats.magicalDamage)}</strong></span></div></div>
        </article>
        <article className="character-module__stat-card">
          <img src="/assets/ui/armor.png" alt="" aria-hidden="true" draggable={false} />
          <div><span>Défense</span><div className="character-module__stat-values"><span><small>Armure</small><strong>{formatValue(character.stats.armor)}</strong></span><span><small>Résist.</small><strong>{formatValue(character.stats.magicResistance)}</strong></span></div></div>
        </article>
      </section>

      <AwakenedWeaponPanel />
    </div>
  );
}
