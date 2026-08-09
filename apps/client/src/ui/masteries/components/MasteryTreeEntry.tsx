export interface MasteryTreeEntryProps {
  readonly onOpen?: () => void;
}

export function MasteryTreeEntry({ onOpen }: MasteryTreeEntryProps): JSX.Element {
  return (
    <button
      type="button"
      className="ui-mastery-tree-entry"
      disabled
      onClick={onOpen}
      data-ui-entry-point="mastery-tree"
    >
      <span aria-hidden="true">✦</span>
      <span><strong>Arbre de maîtrises</strong><small>Fonctionnalité à venir</small></span>
      <b aria-hidden="true">›</b>
    </button>
  );
}
