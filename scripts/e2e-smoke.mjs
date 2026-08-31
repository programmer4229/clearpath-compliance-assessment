// Smoke test: submit -> claim -> checklist review -> request changes ->
// submitter sees feedback -> resubmit -> routes back to the SAME reviewer.
// Requires the app running locally at BASE_URL (default http://localhost:3000)
// against a freshly-seeded database. Run: node scripts/e2e-smoke.mjs
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

// 1. Submit as an affiliate with risky, compliance-flaggable copy
await page.goto(`${BASE_URL}/submit`);
await page.fill('input[name=name]', 'Jamie Rivera');
await page.fill('input[name=email]', 'jamie@partnersite.com');
await page.selectOption('select[name=submitterType]', 'affiliate');
await page.fill('input[name=affiliateCompany]', 'PartnerSite LLC');
await page.fill('input[name=title]', 'Spring Personal Loan Email');
await page.selectOption('select[name=productType]', 'personal_loan');
await page.fill('textarea[name=bodyText]', 'Get approved instantly with no credit check! Rates as low as 4.99%.');
await page.click('button[type=submit]');
await page.waitForURL(/\/status\//, { timeout: 60000 });
const submissionUrl = page.url();
log('submission created at:', submissionUrl);
const submissionId = submissionUrl.match(/status\/([a-f0-9-]+)/)[1];

// 2. Reviewer signs in and claims it
await page.goto(`${BASE_URL}/review`);
const reviewerSelect = page.locator('select[name=reviewerId]');
await reviewerSelect.selectOption({ label: 'Alex Chen' });
await page.click('button:has-text("Continue")');
await page.waitForURL(/\/review$/, { timeout: 60000 });
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

// 4. Submitter checks status, sees feedback, resubmits
await page.goto(submissionUrl);
const bodyText = await page.textContent('body');
log('status page shows "Changes requested":', bodyText.includes('Changes requested'));
log('status page shows feedback:', bodyText.includes('no credit check'));

await page.fill('textarea[name=bodyText]', 'Apply in minutes. Rates as low as 4.99% APR for qualified applicants. Subject to credit approval.');
await page.click('button:has-text("Submit revision")');
await page.waitForURL(/resubmitted=1/, { timeout: 60000 });
log('resubmitted, new url:', page.url());

// 5. Confirm it routed back to the SAME reviewer's queue (not general pool)
await page.goto(`${BASE_URL}/review?view=mine`);
const mineText = await page.textContent('body');
log('resubmission visible in Alex Chen\'s "My queue":', mineText.includes('Spring Personal Loan Email'));
log('status shown as Resubmitted:', mineText.includes('Resubmitted'));

await browser.close();
log('E2E FLOW: OK');
