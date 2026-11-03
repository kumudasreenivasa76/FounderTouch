import { notFound } from "next/navigation";
import { flag } from "@/lib/flags";
import { db } from "@/lib/db";
import { eventAccess } from "@/lib/event-access";
import PageHead from "@/components/page-head";
import VoucherScanner from "@/components/voucher-scanner";
import { redeemVoucher } from "../../extra-actions";
export const dynamic = "force-dynamic";

/** Vendor meal scanner. Open to the organizer and to staff with the Vendor role; vendors see only their assigned meals. */
export default async function Meals({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acc = await eventAccess(id);
  if (!flag("event_vouchers") || !acc || !(acc.owner || acc.isVendor)) notFound();
  const all = await db.voucherPlan.findMany({ where: { eventId: id }, orderBy: { name: "asc" } });
  const plans = acc.owner ? all : all.filter((p) => acc.vendorScopes.some((s) => s === "" || s === p.id));
  return (
    <>
      <PageHead title="Meal scan" sub={`${acc.event.name}. Scan a ticket to hand over one meal.`} back={acc.owner ? `/app/events/${id}` : "/app"} />
      <VoucherScanner eventId={id} plans={plans.map((p) => ({ id: p.id, name: p.name }))} redeem={redeemVoucher} />
    </>
  );
}
