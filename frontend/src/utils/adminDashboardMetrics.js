export function reconcileDashboardTerm(previousTermId, terms) {
  if (!Array.isArray(terms) || terms.length === 0) return "";
  if (terms.some((term) => String(term.id) === String(previousTermId))) return String(previousTermId);
  return terms.length === 1 ? String(terms[0].id) : "";
}

export function calculateDashboardFinance(fees) {
  const totals = fees.reduce((result, fee) => ({
    totalFees: result.totalFees + (Number(fee.amount) || 0),
    totalPaid: result.totalPaid + (Number(fee.paid) || 0),
  }), { totalFees: 0, totalPaid: 0 });
  return { ...totals, totalOutstanding: totals.totalFees - totals.totalPaid };
}
