import { redirect } from "next/navigation";

// The email-lookup flow this page used to be lived here before login
// existed — logged-in marketers/affiliates now see their own submissions
// directly on the home page (src/app/page.tsx), so this just sends anyone
// who still has /status bookmarked there instead of 404ing.
export default function StatusLookupPage() {
  redirect("/");
}
