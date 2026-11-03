import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { eventAccess } from "@/lib/event-access";
import PageHead from "@/components/page-head";
import QrScanner from "@/components/qr-scanner";
import { checkInByCode } from "../../actions";
export const dynamic = "force-dynamic";

export default async function Scan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acc = await eventAccess(id);
  if (!acc || !acc.canCheckIn) notFound();
  const e = await db.event.findUniqueOrThrow({ where: { id }, include: { _count: { select: { attendees: true } } } });
  const checked = await db.attendee.count({ where: { eventId: e.id, checkedInAt: { not: null } } });
  return (
    <>
      <PageHead title="Check-in" sub={`${e.name}. Point the camera at an attendee's ticket QR.`} back={acc.owner ? `/app/events/${e.id}` : "/app"} />
      <QrScanner eventId={e.id} initialChecked={checked} total={e._count.attendees} check={checkInByCode} />
    </>
  );
}
