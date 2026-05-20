export const DEFAULT_PPN_RATE = 11;

export interface LineTaxBreakdown {
  dpp: number;
  ppn: number;
  total: number;
}

export function lineTaxBreakdown(
  qty: number,
  unitPrice: number,
  ppnIncluded = true,
  ppnRate = DEFAULT_PPN_RATE
): LineTaxBreakdown {
  const q = Number(qty) || 0;
  const p = Number(unitPrice) || 0;
  const rate = Number(ppnRate) || DEFAULT_PPN_RATE;
  const gross = q * p;

  if (ppnIncluded) {
    const factor = 1 + rate / 100;
    const dpp = gross / factor;
    const ppn = gross - dpp;
    return {
      dpp: Number(dpp.toFixed(2)),
      ppn: Number(ppn.toFixed(2)),
      total: Number(gross.toFixed(2)),
    };
  }

  const dpp = gross;
  const ppn = dpp * (rate / 100);
  return {
    dpp: Number(dpp.toFixed(2)),
    ppn: Number(ppn.toFixed(2)),
    total: Number((dpp + ppn).toFixed(2)),
  };
}
