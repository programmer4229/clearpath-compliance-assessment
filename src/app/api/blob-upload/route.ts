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
// Uses the *presigned* flow (issueSignedToken + handleUploadPresigned), not
// the older handleUpload. handleUpload needs a static BLOB_READ_WRITE_TOKEN
// in the environment to mint client tokens; connecting a store to a project
// here only provisions BLOB_STORE_ID + BLOB_WEBHOOK_PUBLIC_KEY (OIDC-based —
// no long-lived static token at all, which is also just better practice), so
// handleUpload failed outright with "Failed to retrieve the client token."
// handleUploadPresigned is built for exactly that: OIDC to mint the signed
// token server-side, BLOB_WEBHOOK_PUBLIC_KEY to verify the completion
// callback. See https://vercel.com/docs/vercel-blob/vercel-signed-urls.
//
// This route only brokers short-lived signed URLs (and, if this deployment
// is publicly reachable, a completion callback); it never sees file bytes.
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ALLOWED_ATTACHMENT_CONTENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/attachments";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadPresignedBody;

  try {
    const jsonResponse = await handleUploadPresigned({
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
      getSignedToken: async (pathname) => ({
        token: await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: [...ALLOWED_ATTACHMENT_CONTENT_TYPES],
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
        }),
        urlOptions: {
          allowedContentTypes: [...ALLOWED_ATTACHMENT_CONTENT_TYPES],
          maximumSizeInBytes: MAX_ATTACHMENT_BYTES,
          addRandomSuffix: true,
        },
      }),
      onUploadCompleted: async () => {
        // No-op: the browser already has the blob URL as soon as
        // uploadPresigned() resolves and passes it along in the
        // submission/revision form, so there's nothing left to persist
        // here. (This callback is delivered as a webhook from Vercel's
        // Blob service, so it also isn't reachable from `next dev` on
        // localhost — that's expected.)
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
