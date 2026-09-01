// Delivers attachments stored in a Private Vercel Blob store.
//
// Private blob URLs (https://<store-id>.private.blob.vercel-storage.com/...)
// require an authenticated request on every read — they can't be dropped
// straight into an <img src> or <a href> the way public blob URLs can. This
// route is that authenticated hop: it fetches the blob server-side with
// get() and streams it back.
//
// This route requires a signed-in session (checked below) — /api routes are
// deliberately excluded from src/proxy.ts's matcher (see that file), so
// that gate doesn't happen automatically the way it does for pages. Beyond
// "logged in as someone," it still relies on the exact blob URL being
// unguessable (URL-as-capability) rather than checking that the requester
// actually owns or is assigned to the submission this attachment belongs
// to — see docs/PRD.md > Roles for the wiring that would make that check
// possible.
import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { verifySession } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await verifySession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let result;
  try {
    result = await get(url, { access: "private" });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!result || result.statusCode !== 200) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      // Private, per-user-relevant content — don't let intermediate caches
      // hold onto it; the browser can still cache its own copy.
      "Cache-Control": "private, no-cache",
    },
  });
}
