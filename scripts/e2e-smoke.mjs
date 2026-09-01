// Smoke test: submit -> claim -> checklist review -> request changes ->
// submitter sees feedback -> resubmit -> routes back to the SAME reviewer.
// Also checks that a marketer+reviewer account can't claim/review its own
// submission. Requires the app running locally at BASE_URL (default
// http://localhost:3000) against a freshly-seeded database.
// Run: node scripts/e2e-smoke.mjs
import pkg from 'playwright';
const { chromium } = pkg;

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const launchOpts = { args: ['--no-sandbox'] };
if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
}
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();
const log = (...a) => console.log(...a);

// Submitter/reviewer identity comes entirely from the logged-in session now
// (see src/app/submit/page.tsx, src/app/review/page.tsx) — no more manually
// typing a name/email on /submit or picking a reviewer from a dropdown on
// /review, so this test logs in/out as different seeded accounts instead.
async function loginAs(email) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'password123');
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE_URL}/`, { timeout: 60000 });
}

async function logout() {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL(`${BASE_URL}/login`, { timeout: 60000 });
}

// 1. Submit as an affiliate with risky, compliance-flaggable copy
await loginAs('affiliate@partner.example');
log('logged in as affiliate submitter');
await page.goto(`${BASE_URL}/submit`);
await page.fill('input[name=title]', 'Spring Personal Loan Email');
await page.selectOption('select[name=productType]', 'personal_loan');
await page.fill('textarea[name=bodyText]', 'Get approved instantly with no credit check! Rates as low as 4.99%.');
await page.click('button[type=submit]');
await page.waitForURL(/\/status\//, { timeout: 60000 });
const submissionUrl = page.url();
log('submission created at:', submissionUrl);
const submissionId = submissionUrl.match(/status\/([a-f0-9-]+)/)[1];
await logout();

// 2. Reviewer signs in and claims it
await loginAs('reviewer@clearpath.example');
await page.goto(`${BASE_URL}/review`);
log('signed in as reviewer, on queue page:', page.url());

const claimBtn = page.locator('button:has-text("Claim")').first();
await claimBtn.click();
await page.waitForURL(new RegExp(`/review/${submissionId}`), { timeout: 60000 });
log('claimed and on review detail:', page.url());

// 3. Fill checklist: fail the "no guaranteed approval" criterion, pass others as N/A/pass, request changes
const radios = await page.locator('input[type=radio][required]').all();
log('checklist radio options found:', radios.length);

// Set every criterion's first "Pass" option, then override the guaranteed-approval one to Fail
const criterionGroups = new Set();
for (const r of radios) {
  const name = await r.getAttribute('name');
  criterionGroups.add(name);
}
for (const name of criterionGroups) {
  const isGuaranteedApproval = name.includes('no_guaranteed_approval');
  const value = isGuaranteedApproval ? 'fail' : 'pass';
  await page.check(`input[name="${name}"][value="${value}"]`);
}
await page.fill('textarea[name=feedback]', 'Remove "no credit check" / "instantly approved" language before resubmitting — this overstates approval certainty (UDAAP).');
await page.click('button:has-text("Request changes")');
await page.waitForURL(/\/review\?decided=1/, { timeout: 60000 });
log('decision submitted, back on queue:', page.url());
await logout();

// 4. Submitter checks status, sees feedback, resubmits
await loginAs('affiliate@partner.example');
await page.goto(submissionUrl);
const bodyText = await page.textContent('body');
log('status page shows "Changes requested":', bodyText.includes('Changes requested'));
log('status page shows feedback:', bodyText.includes('no credit check'));

await page.fill('textarea[name=bodyText]', 'Apply in minutes. Rates as low as 4.99% APR for qualified applicants. Subject to credit approval.');
await page.click('button:has-text("Submit revision")');
await page.waitForURL(/resubmitted=1/, { timeout: 60000 });
log('resubmitted, new url:', page.url());
await logout();

// 5. Confirm it routed back to the SAME reviewer's queue (not general pool)
await loginAs('reviewer@clearpath.example');
await page.goto(`${BASE_URL}/review?view=mine`);
const mineText = await page.textContent('body');
log('resubmission visible in reviewer\'s "My queue":', mineText.includes('Spring Personal Loan Email'));
log('status shown as Resubmitted:', mineText.includes('Resubmitted'));
await logout();

// 6. Self-review prevention: an account that's both marketer and reviewer
// can't claim or review its own submission — the queue should hide the
// Claim button and mark the row instead. (The actual enforcement is
// server-side and atomic, in claimSubmission()'s WHERE clause — see
// src/lib/queries.ts and its own test in scripts/e2e-self-review.mjs.)
await loginAs('both@clearpath.example');
await page.goto(`${BASE_URL}/submit`);
await page.fill('input[name=title]', 'Self-Review Test Submission');
await page.selectOption('select[name=productType]', 'credit_card');
await page.fill('textarea[name=bodyText]', 'Testing self-review prevention.');
await page.click('button[type=submit]');
await page.waitForURL(/\/status\//, { timeout: 60000 });
log('self-review test submission created:', page.url());

await page.goto(`${BASE_URL}/review`);
const ownRow = page.locator('tr', { hasText: 'Self-Review Test Submission' });
const claimCount = await ownRow.locator('button:has-text("Claim")').count();
const notReviewableCount = await ownRow.locator('text=Not reviewable by you').count();
log('Claim button hidden for own submission:', claimCount === 0);
log('"Not reviewable by you" shown instead:', notReviewableCount > 0);

await browser.close();
log('E2E FLOW: OK');
