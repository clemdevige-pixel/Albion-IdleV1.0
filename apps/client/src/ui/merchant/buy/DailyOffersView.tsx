import { useEffect, useMemo, useState } from "react";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import { getItemDisplayName, ItemVisual } from "../../../panels/ItemVisual";
import { TransactionConfirmModal } from "../../../panels/TransactionConfirmModal";
import {
  dailyMerchantRotation,
  getDailyMerchantNextResetAt,
  type DailyMerchantOffer,
} from "../../../runtime/DailyMerchantRotation";
import { useGameUiSelector } from "../../state/useGameUiSelector";
import { useMerchantData } from "../useMerchantData";
import { useVendorTransactionExecutor } from "../shared/useVendorTransactionExecutor";

function formatReset(nowMs: number): string {
  const remainingMs = Math.max(0, getDailyMerchantNextResetAt(nowMs) - nowMs);
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours)}h ${String(minutes).padStart(2, "0")}`;
}

export function DailyOffersView(): JSX.Element | null {
  const { wallet } = useMerchantData();
  const unlockedTiers = useGameUiSelector((state) => (
    [...new Set(state.world.zones.filter((zone) => zone.isUnlocked).map((zone) => zone.tier))]
  ));
  const executeTransaction = useVendorTransactionExecutor();
  const [clock, setClock] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<DailyMerchantOffer | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => { setClock(Date.now()); }, 60_000);
    return () => { window.clearInterval(intervalId); };
  }, []);

  const offers = useMemo(
    () => dailyMerchantRotation.getOffers(clock, unlockedTiers),
    [clock, unlockedTiers, revision],
  );

  if (offers.length === 0) return null;

  return (
    <section className="ui-merchant-daily" aria-label="Arrivage quotidien">
      <div className="ui-merchant-section-title">
        <span>Arrivage quotidien</span>
        <small>5 offres · reset dans {formatReset(clock)}</small>
      </div>
      <div className="ui-merchant-daily__grid">
        {offers.map((offer) => (
          <button
            type="button"
            key={offer.offerId}
            className={`ui-merchant-daily__offer${offer.purchased ? " is-purchased" : ""}`}
            disabled={offer.purchased || wallet.silver < offer.totalPrice}
            onClick={() => { setPending(offer); }}
          >
            <ItemHoverTooltip itemId={offer.itemId} quantity={offer.quantity}>
              <span className="ui-merchant-daily__visual"><ItemVisual itemId={offer.itemId} /></span>
            </ItemHoverTooltip>
            <span className="ui-merchant-daily__identity">
              <strong>{getItemDisplayName(offer.itemId)}</strong>
              <small>T{String(offer.tier)} · ×{String(offer.quantity)}</small>
            </span>
            <span className="ui-merchant-daily__price">
              {offer.purchased ? "Vendu" : `${String(offer.totalPrice)} S`}
            </span>
          </button>
        ))}
      </div>

      {pending !== null && (
        <TransactionConfirmModal
          title="Acheter l’arrivage"
          cost={pending.totalPrice}
          balance={wallet.silver}
          confirmLabel="Acheter"
          onConfirm={() => {
            const succeeded = executeTransaction({
              direction: "buy",
              itemId: pending.itemId,
              quantity: pending.quantity,
              unitPrice: pending.unitPrice,
              incomeRate: wallet.incomeRate,
            });
            if (succeeded && dailyMerchantRotation.markPurchased(pending.offerId)) {
              setRevision((value) => value + 1);
            }
            setPending(null);
          }}
          onCancel={() => { setPending(null); }}
        >
          <p className="tx-modal__item-name">
            {getItemDisplayName(pending.itemId)} ×{String(pending.quantity)}
          </p>
        </TransactionConfirmModal>
      )}
    </section>
  );
}
