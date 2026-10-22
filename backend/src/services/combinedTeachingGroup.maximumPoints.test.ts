import assert from "node:assert/strict";
import test from "node:test";
import { CombinedTeachingGroupError, updateCombinedAssignment } from "./combinedTeachingGroup.service";

test("combined-assignment update rejects maximum points before writing logical or child assignments", async () => {
  let transactions = 0;
  const client = {
    $transaction: async () => {
      transactions += 1;
      throw new Error("transaction must not start");
    },
  };

  await assert.rejects(
    () => updateCombinedAssignment(client, 1, 2, 3, { title: "Allowed title", maxPoints: 40 }),
    (error: any) => error instanceof CombinedTeachingGroupError &&
      error.status === 400 &&
      error.message === "Maximum-point editing for combined assignments is not yet supported",
  );
  assert.equal(transactions, 0);
});

test("combined-assignment update rejects even an undefined maximum-points property", async () => {
  await assert.rejects(
    () => updateCombinedAssignment({ $transaction: async () => undefined }, 1, 2, 3, { maxPoints: undefined }),
    /Maximum-point editing for combined assignments is not yet supported/,
  );
});
