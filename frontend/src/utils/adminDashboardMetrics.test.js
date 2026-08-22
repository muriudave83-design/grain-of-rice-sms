import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardFinance, reconcileDashboardTerm } from "./adminDashboardMetrics.js";

test("no terms clears stale deleted selection", () => assert.equal(reconcileDashboardTerm("9", []), ""));
test("one valid term is selected explicitly and a valid selection is preserved", () => {
  assert.equal(reconcileDashboardTerm("9", [{ id: 10 }]), "10");
  assert.equal(reconcileDashboardTerm("10", [{ id: 10 }]), "10");
});
test("multiple terms do not guess a replacement for a deleted selection", () => {
  assert.equal(reconcileDashboardTerm("9", [{ id: 10 }, { id: 11 }]), "");
  assert.equal(reconcileDashboardTerm("11", [{ id: 10 }, { id: 11 }]), "11");
});
test("school-wide fee totals do not depend on terms", () => assert.deepEqual(calculateDashboardFinance([
  { amount: 1000, paid: 250 }, { amount: 500, paid: 500 },
]), { totalFees: 1500, totalPaid: 750, totalOutstanding: 750 }));
