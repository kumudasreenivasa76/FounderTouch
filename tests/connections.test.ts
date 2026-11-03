import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../lib/csv";
import { skillMatch, nextStage } from "../lib/hiring";
import { logActivity } from "../lib/activity";
import { db } from "../lib/db";

test("csv: quotes, commas inside fields, semicolons and blank lines", () => {
  const rows = parseCsv('name,email,company\n"Rao, Ana",ana@x.io,"Acme ""Labs"""\n\nBo;bo@y.io;Beta\n');
  assert.deepEqual(rows[0], ["name", "email", "company"]);
  assert.deepEqual(rows[1], ["Rao, Ana", "ana@x.io", 'Acme "Labs"']);
  assert.deepEqual(rows[2], ["Bo", "bo@y.io", "Beta"]);
  assert.equal(rows.length, 3);
});

test("hiring: skill matching is forgiving and stages move forward only", () => {
  assert.deepEqual(skillMatch("Figma, Prototyping, Research", "figma; user research\nSketch"), { hit: 2, total: 3 });
  assert.deepEqual(skillMatch("", "anything"), { hit: 0, total: 0 });
  assert.equal(nextStage("NEW"), "SHORTLISTED");
  assert.equal(nextStage("OFFER"), "HIRED");
  assert.equal(nextStage("HIRED"), null);
  assert.equal(nextStage("REJECTED"), null);
});

test("a contact's history is recorded and removed with the contact", async () => {
  const p = await db.profile.findFirstOrThrow();
  const c = await db.contact.create({ data: { profileId: p.id, name: "T", email: `t${Math.random()}@x.io`, mode: "ALL" } });
  await logActivity(c.id, "note", "hello");
  await logActivity(c.id, "followup", "set");
  assert.equal(await db.contactActivity.count({ where: { contactId: c.id } }), 2);
  await db.contact.delete({ where: { id: c.id } });
  assert.equal(await db.contactActivity.count({ where: { contactId: c.id } }), 0);
});
