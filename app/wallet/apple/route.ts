import { NextResponse } from "next/server";

/** Apple Wallet passes must be signed with the owner's Apple Developer certificate, so this explains the requirement. */
export async function GET() {
  return new NextResponse(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px/1.5 system-ui;max-width:520px;margin:32px auto;padding:0 16px">
    <h2>Apple Wallet needs an Apple Developer account</h2>
    <p>Apple only accepts Wallet passes signed with a certificate from a paid Apple Developer account (a <b>Pass Type ID</b>). Until that certificate is added, this app can't create the pass.</p>
    <p><b>What works right now on iPhone:</b></p>
    <ul><li>Tap <b>Card image</b> in Share, then save it to Photos. You can open it in a second.</li>
    <li>In Safari tap Share → <b>Add to Home Screen</b> on your page for one-tap access.</li>
    <li>Anyone can tap <b>Save contact</b> on your page to add you to their Contacts.</li></ul>
    <p><a href="/app?pane=wallet">← Back</a></p></body>`, { status: 501, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
