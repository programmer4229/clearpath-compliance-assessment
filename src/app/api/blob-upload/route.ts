// Token-exchange endpoint for direct browser -> Vercel Blob uploads.
//
// Why this exists: Vercel Functions (including Next.js Server Actions) hard-cap
// the request body at 4.5MB at the platform level, before your code even runs
// — see https://vercel.com/docs/functions/limitations#request-body-size. A
// compliance-marketing PDF or a phone photo blows past that easily, and the
// failure is silent (a platform-level 413, never reaching app code, so it
// never shows up in Vercel's function logs). Routing the file bytes straight
// from the browser to Blob storage, and only sending the resulting URL through
// the normal Server Action, sidesteps the limit entirely.
//
// This route only brokers short-lived upload tokens (and, if this deployment
// is publicly reachable, a completion callback); it never sees file bytes.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ALLOWED_ATTACHMENT_CONTENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Vercel's own guidance is to authenticate/authorize the requester
      // here before handing out an upload token, since an unchecked route
      // lets anyone upload into the store. This MVP deliberately has no
      // login system at all (see docs/PRD.md > Non-Goals — a role-switcher
      // stands in for identity), so there's no per-user session to check
      // here either; content-type and size are the only gate. Flagging that
      // explicitly rather than silently skipping it: a real deployment
      // handling actual regulated content would add real auth first.
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ALLOWED_ATTACHMENT_CONTENT_TYPES],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
      }),
      onUploadCompleted: async () => {
        // No-op: the browser already has the blob URL as soon as upload()
        // resolves and passes it along in the submission/revision form, so
        // there's nothing left to persist here. (This callback is delivered
        // as a webhook from Vercel's Blob service, so it also isn't
        // reachable from `next dev` on localhost — that's expected.)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload token request failed." },
      { status: 400 }
    );
  }
}
