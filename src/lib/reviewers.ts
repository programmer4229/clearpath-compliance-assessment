// No real auth for this MVP — reviewers are picked from a seeded list and
// "logged in" via a plain cookie. See PRD > Non-Goals.
import { cookies } from "next/headers";
import { db } from "./db";

export const REVIEWER_COOKIE = "clearpath_reviewer_id";

export async function getCurrentReviewer() {
  const store = await cookies();
  const id = store.get(REVIEWER_COOKIE)?.value;
  if (!id) return null;
  return db.selectFrom("reviewers").selectAll().where("id", "=", id).executeTakeFirst() ?? null;
}

export async function listReviewers() {
  return db.selectFrom("reviewers").selectAll().orderBy("name").execute();
}
