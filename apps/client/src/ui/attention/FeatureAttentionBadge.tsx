import "./featureAttentionBadge.css";

export function FeatureAttentionBadge({ count = 1 }: { readonly count?: number }): JSX.Element {
  if (count <= 0) return <></>;
  return (
    <span
      className="feature-attention-badge"
      aria-label={count === 1 ? "Nouveau" : `${String(count)} nouveautés`}
      title={count === 1 ? "Nouveau" : `${String(count)} nouveautés`}
    >
      {count > 1 ? String(Math.min(count, 9)) : "!"}
    </span>
  );
}
