import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import QrScanner from "@/components/qr-scanner";
import { checkInByCode } from "../../actions";
export const dynamic = "force-dynamic";

export default async function Scan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOwner();
  const e = await db.event.findFirst({ where: { id, profileId: profile.id }, include: { _count: { select: { attendees: true } } } });
  if (!e) notFound();
  const checked = await db.attendee.count({ where: { eventId: e.id, checkedInAt: { not: null } } });
  return (
    <>
      <PageHead title="Check-in" sub={`${e.name}. Point the camera at an attendee's ticket QR.`} back={`/app/events/${e.id}`} />
      <QrScanner eventId={e.id} initialChecked={checked} total={e._count.attendees} check={checkInByCode} />
    </>
  );
}
