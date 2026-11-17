import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { docxText, fromLinkedIn, fromResume, pdfText } from "@/lib/profile-import";

const MAX = 30 * 1024 * 1024;
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Reads an uploaded LinkedIn export or resume and returns what it found. Nothing is saved here. */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!u?.profile) return fail("Please sign in again.", 401);
  const fd = await req.formData();
  const kind = String(fd.get("kind"));
  const files = (fd.getAll("file").filter((f) => f instanceof File && f.size > 0) as File[]);
  if (files.reduce((n, f) => n + f.size, 0) > MAX) return fail("Those files are over 30 MB. For LinkedIn, upload only Profile.csv, Positions.csv, Education.csv and Skills.csv.");

  try {
    if (kind === "linkedin") {
      if (!files.length) return fail("Choose your LinkedIn ZIP file, or the CSV files from inside it.");
      const draft = fromLinkedIn(await Promise.all(files.map(async (f) => ({ name: f.name, data: Buffer.from(await f.arrayBuffer()) }))));
      if (!draft.items.length && !draft.skills.length && !draft.headline) return fail("No profile data was found in that upload. Make sure it is the LinkedIn data export, with Positions.csv or Profile.csv inside.");
      return NextResponse.json({ ok: true, draft });
    }

    let text = String(fd.get("text") ?? "").trim();
    const f = files[0];
    if (f) {
      const buf = Buffer.from(await f.arrayBuffer());
      if (/\.docx$/i.test(f.name)) text = docxText(buf);
      else if (/\.pdf$/i.test(f.name)) {
        const t = await pdfText(buf);
        if (t === null) return fail("PDF reading is not set up on this server yet. Upload the Word (.docx) version, or open the PDF, copy all the text and paste it below.");
        text = t;
      } else if (/\.(txt|md|rtf)$/i.test(f.name)) text = buf.toString("utf8");
      else return fail("Use a Word (.docx), PDF or text file, or paste the text.");
    }
    if (text.length < 40) return fail("Add a resume file, or paste its text.");
    const draft = fromResume(text.slice(0, 200000));
    if (!draft.items.length && !draft.skills.length) return fail("No experience, education or skills were recognised. Check that the resume has headings such as Experience, Education and Skills.");
    return NextResponse.json({ ok: true, draft });
  } catch {
    return fail("That file could not be read. Check it is the right file and try again.");
  }
}
