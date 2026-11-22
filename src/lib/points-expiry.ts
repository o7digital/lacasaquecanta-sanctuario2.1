// Reconstruct unspent lots from the immutable ledger. Negative corrections can
// consume later credits; expiry never deducts points already spent or reversed.
export function unspentLots(
  rows: Array<{
    id: string;
    points: number;
    kind: string;
    event_key: string;
    reverses?: string | null;
    expires_at?: Date | string | null;
  }>,
) {
  const lots: Array<{ id: string; remaining: number; expiresAt: Date | null }> =
    [];
  let debt = 0;
  for (const row of rows) {
    if (row.points > 0) {
      const consumed = Math.min(debt, row.points);
      debt -= consumed;
      lots.push({
        id: row.id,
        remaining: row.points - consumed,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      });
      continue;
    }
    let debit = -row.points;
    const targeted =
      row.reverses ||
      (row.kind === "expired" && row.event_key.startsWith("expire:")
        ? row.event_key.slice(7)
        : null);
    if (targeted) {
      const lot = lots.find((l) => l.id === targeted);
      if (lot) {
        const used = Math.min(lot.remaining, debit);
        lot.remaining -= used;
        debit -= used;
      }
    }
    for (const lot of lots) {
      if (!debit) break;
      const used = Math.min(lot.remaining, debit);
      lot.remaining -= used;
      debit -= used;
    }
    debt += debit;
  }
  return lots;
}
