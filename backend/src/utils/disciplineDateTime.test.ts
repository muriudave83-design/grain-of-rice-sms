import assert from "node:assert/strict";
import test from "node:test";
import { parseIncidentDateTime } from "./disciplineDateTime";

const now = new Date("2026-08-22T09:00:00.000Z");

test("custom Nairobi incident date/time becomes the correct stored UTC instant", () => {
  const result = parseIncidentDateTime("2026-08-21", "10:35", now);
  assert.ok("value" in result);
  if ("value" in result) assert.equal(result.value.toISOString(), "2026-08-21T07:35:00.000Z");
});

test("invalid calendar date is rejected", () => {
  assert.deepEqual(parseIncidentDateTime("2026-02-30", "10:35", now), { error: "INVALID_DATE" });
  assert.deepEqual(parseIncidentDateTime("22/08/2026", "10:35", now), { error: "INVALID_DATE" });
});

test("invalid incident time is rejected", () => {
  assert.deepEqual(parseIncidentDateTime("2026-08-21", "24:00", now), { error: "INVALID_TIME" });
  assert.deepEqual(parseIncidentDateTime("2026-08-21", "10:99", now), { error: "INVALID_TIME" });
});

test("obviously future timestamp is rejected while five-minute clock tolerance is allowed", () => {
  assert.deepEqual(parseIncidentDateTime("2026-08-22", "12:06", now), { error: "FUTURE_TIMESTAMP" });
  assert.ok("value" in parseIncidentDateTime("2026-08-22", "12:05", now));
});
