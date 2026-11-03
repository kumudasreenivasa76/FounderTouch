import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { isPrivateIp, safeHttpsUrl } from "../lib/safe-url";
import { applyBrand, brandLocked } from "../lib/org";
import { deliver } from "../lib/integrations";

test("webhook addresses: private, local and non-https targets are refused", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPrivateIp(ip), false, ip);
  for (const u of ["http://8.8.8.8/x", "https://localhost/x", "https://127.0.0.1/x", "https://169.254.169.254/latest", "https://user:pw@8.8.8.8/x", "ftp://8.8.8.8", "not a url", "https://printer.local/x"]) assert.equal(await safeHttpsUrl(u), null, u);
  assert.ok(await safeHttpsUrl("https://8.8.8.8/hook"));
});

test("a blocked webhook is logged as failed and never sent", async () => {
  const p = await db.profile.findFirstOrThrow();
  const i = await db.integration.create({ data: { profileId: p.id, label: "t", url: "https://127.0.0.1/hook" } });
  const r = await deliver(i, "contact.created", { name: "x" });
  assert.equal(r.ok, false);
  const d = await db.integrationDelivery.findFirst({ where: { integrationId: i.id } });
  assert.equal(d?.ok, false);
  await db.integration.delete({ where: { id: i.id } });
});

test("team brand is applied to a member and the lock only binds members, not the owner", async () => {
  const stamp = Math.random().toString(36).slice(2);
  const mk = async (n: string) => {
    const u = await db.user.create({ data: { email: `${n}${stamp}@t.io`, passwordHash: "x", name: n } });
    const p = await db.profile.create({ data: { userId: u.id, handle: `${n}${stamp}`, name: n, company: "Old Co" } });
    return { u, p };
  };
  const owner = await mk("own"), member = await mk("mem");
  const org = await db.organization.create({ data: { name: "Acme", company: "Acme Inc", color1: "#112233", color2: "#445566", brandLocked: true } });
  await db.orgMember.create({ data: { orgId: org.id, userId: owner.u.id, role: "OWNER" } });
  await db.orgMember.create({ data: { orgId: org.id, userId: member.u.id, role: "MEMBER" } });
  await applyBrand(member.p.id, org);
  const after = await db.profile.findUniqueOrThrow({ where: { id: member.p.id } });
  assert.equal(after.company, "Acme Inc");
  assert.equal(after.theme, "custom:#112233:#445566");
  assert.equal(await brandLocked(member.u.id), true);
  assert.equal(await brandLocked(owner.u.id), false);
  await db.organization.delete({ where: { id: org.id } });
  assert.equal(await brandLocked(member.u.id), false); // leaving or deleting the team frees them
  await db.user.deleteMany({ where: { id: { in: [owner.u.id, member.u.id] } } });
});
