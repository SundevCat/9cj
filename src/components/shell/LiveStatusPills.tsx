"use client";

import { useStream } from "@/components/stream/StreamProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function LiveStatusPills() {
  const { connected, price, metrics } = useStream();
  const priceLabel = price ? `XAU ${price.value.toFixed(2)}` : "XAU —";
  const priceTone = !price ? "neutral" : price.delta >= 0 ? "green" : "red";
  const approvals = metrics?.approvalsPending ?? 0;

  return (
    <div className="flex items-center gap-2">
      <StatusBadge
        label={connected ? "LIVE" : "OFFLINE"}
        tone={connected ? "green" : "neutral"}
        pulse={connected}
      />
      <StatusBadge label={priceLabel} tone={priceTone} />
      {approvals > 0 && (
        <StatusBadge label={`${approvals} APPROVAL${approvals === 1 ? "" : "S"}`} tone="amber" />
      )}
    </div>
  );
}
