import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { redeemOne } from "../lib/vouchers";
import { notify } from "../lib/notify";

/** Runs against the project's own local SQLite file only, and cleans up after itself. */
async function setup() {
  const p = await db.profile.findFirstOrThrow();
  const ev = await db.event.create({ data: { profileId: p.id, slug: "t-" + Math.random().toString(36).slice(2), name: "Test" } });
  const a = await db.attendee.create({ data: { eventId: ev.id, name: "A", email: `a${Math.random()}@x.io`, token: Math.random().toString(36).slice(2) } });
  const plan = await db.voucherPlan.create({ data: { eventId: ev.id, name: "Lunch", perPerson: 1 } });
  return { ev, a, plan };
}

test("two simultaneous meal scans: exactly one wins", async () => {
  const { ev, a, plan } = await setup();
  const res = await Promise.all([redeemOne(plan.id, a.id, "v1"), redeemOne(plan.id, a.id, "v2")]);
  assert.equal(res.filter((r) => r.won).length, 1);
  assert.equal((await redeemOne(plan.id, a.id, "v3")).won, false);
  await db.event.delete({ where: { id: ev.id } });
});

test("a quota of 2 allows exactly two meals", async () => {
  const { ev, a, plan } = await setup();
  await db.voucherPlan.update({ where: { id: plan.id }, data: { perPerson: 2 } });
  const wins = [];
  for (let i = 0; i < 3; i++) wins.push((await redeemOne(plan.id, a.id, "v")).won);
  assert.deepEqual(wins, [true, true, false]);
  await db.event.delete({ where: { id: ev.id } });
});

test("a notification is only sent once for the same trigger, recipient and ref", async () => {
  const ref = "r" + Math.random();
  assert.notEqual(await notify("t", "x@y.io", ref, "s", "b"), "duplicate");
  assert.equal(await notify("t", "x@y.io", ref, "s", "b"), "duplicate");
  await db.notificationDelivery.deleteMany({ where: { ref } });
});

test("a check-in flip only succeeds once", async () => {
  const { ev, a } = await setup();
  const flip = () => db.attendee.updateMany({ where: { id: a.id, checkedInAt: null }, data: { checkedInAt: new Date() } });
  const r = await Promise.all([flip(), flip()]);
  assert.equal(r.reduce((n, x) => n + x.count, 0), 1);
  await db.event.delete({ where: { id: ev.id } });
});
