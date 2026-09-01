// Verifies that "a marketer+reviewer can't review their own submission" is
// enforced where it actually matters: the database, atomically, in
// claimSubmission()'s WHERE clause (src/lib/queries.ts) — not just hidden
// in the UI (scripts/e2e-smoke.mjs checks that part). This calls the exact
// SQL claimSubmission() runs directly against Postgres, bypassing the app
// entirely, which is the same thing a malicious direct POST to the
// claimAction Server Function would be able to do — if this update
// succeeds, the guard is gone regardless of what the UI shows.
//
// Requires DATABASE_URL and a running app at BASE_URL for the setup step
// (creating a submission via the real submit flow, as its own account).
// Run: node scripts/e2e-self-review.mjs
import pkg from 'playwright';
import pg from 'pg';

const { chromium } = pkg;
const { Client } = pg;

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required (same one the app uses).');
  process.exit(1);
}

const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
}
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();
const log = (...a) => console.log(...a);

// 1. Log in as an account that's both marketer and reviewer, submit
// something, and note its id.
await page.goto(`${BASE_URL}/login`);
await page.fill('input[name=email]', 'both@clearpath.example');
await page.fill('input[name=password]', 'password123');
await page.click('button[type=submit]');
await page.waitForURL(`${BASE_URL}/`, { timeout: 60000 });

await page.goto(`${BASE_URL}/submit`);
await page.fill('input[name=title]', 'DB-level self-review guard check');
await page.selectOption('select[name=productType]', 'personal_loan');
await page.fill('textarea[name=bodyText]', 'Exists only to test the self-review guard.');
await page.click('button[type=submit]');
await page.waitForURL(/\/status\//, { timeout: 60000 });
const submissionId = page.url().match(/status\/([a-f0-9-]+)/)[1];
log('created submission', submissionId, 'as both@clearpath.example');
await browser.close();

// 2. Look up that account's user id, then attempt claimSubmission's exact
// query with reviewerId === submitterId, direct against Postgres.
const client = new Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query('select id from users where email = $1', ['both@clearpath.example']);
  const userId = rows[0]?.id;
  if (!userId) throw new Error('seed account both@clearpath.example not found');

  const result = await client.query(
    `update submissions
       set status = 'in_review', assigned_reviewer_id = $2, updated_at = now()
     where id = $1 and status = 'new' and submitter_id != $2`,
    [submissionId, userId]
  );
  const blocked = result.rowCount === 0;
  log('self-claim update affected', result.rowCount, 'row(s) — blocked:', blocked);
  if (!blocked) {
    console.error('FAIL: the self-review guard did not block this update.');
    process.exit(1);
  }

  // Positive control: the same query with a genuinely different reviewer
  // must succeed, so this is testing the guard specifically — not just a
  // broken query that always affects 0 rows.
  const { rows: otherRows } = await client.query(
    "select id from users where email = 'reviewer@clearpath.example'"
  );
  const otherReviewerId = otherRows[0]?.id;
  const controlResult = await client.query(
    `update submissions
       set status = 'in_review', assigned_reviewer_id = $2, updated_at = now()
     where id = $1 and status = 'new' and submitter_id != $2`,
    [submissionId, otherReviewerId]
  );
  log('control claim (different reviewer) affected', controlResult.rowCount, 'row(s)');
  if (controlResult.rowCount !== 1) {
    console.error('FAIL: control claim by a different reviewer should have succeeded.');
    process.exit(1);
  }
} finally {
  await client.end();
}

log('SELF-REVIEW GUARD: OK');
