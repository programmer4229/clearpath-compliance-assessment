// Delivers attachments stored in a Private Vercel Blob store.
//
// Private blob URLs (https://<store-id>.private.blob.vercel-storage.com/...)
// require an authenticated request on every read — they can't be dropped
// straight into an <img src> or <a href> the way public blob URLs can. This
// route is that authenticated hop: it fetches the blob server-side with
// get() and streams it back.
//
// "Authenticated" here matches this app's existing trust model rather than
// inventing a new one: per the PRD this MVP has no real login system for
// either reviewers or submitters (see docs/PRD.md > Non-Goals) — a
// /status/[id] page is already only as protected as knowing its URL is. This
// route holds attachments to that same bar: you need the exact blob URL
// recorded against a real attachment (which only ever appears embedded in a
// submission's own review/status pages), not a public guess. It is not
// equivalent to per-user authorization, and a real deployment handling
// actual regulated financial content would want one — noted here
// deliberately rather than glossed over.
import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
